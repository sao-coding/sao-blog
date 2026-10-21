import { and, count, eq, gte, inArray } from 'drizzle-orm'
import { db } from '@sao-blog/db'
import { commentBlocklist, comments } from '@sao-blog/db/schema/index'
import { getSecuritySettings, type SecuritySettings } from '@sao-blog/db/settings'
import { consumeRateLimit, formatRetryAfter, HOUR, MINUTE } from './rate-limit'
import { turnstileEnabled, verifyTurnstile } from './turnstile'

// 留言送出前的檢查，照順序：蜜罐 → Turnstile → 限流 → 封鎖清單 → 內容過濾 → 信任判斷。
// 結果分三種：
// - reject：直接回錯誤給使用者（限流、驗證失敗、重複內容…）
// - drop：假裝成功但不存（蜜罐：讓機器人以為成功，不給它調整的線索）
// - accept：存進資料庫，status 決定公開與否；spam 也存，但使用者看到的訊息跟待審一樣

export type CommentStatus = 'pending' | 'approved' | 'spam' | 'rejected'

export type GuardResult =
  | { kind: 'reject'; message: string }
  | { kind: 'drop' }
  | { kind: 'accept'; status: CommentStatus; flagReason: string | null }

interface GuardInput {
  content: string
  honeypot?: string
  turnstileToken?: string
  user: { id: string; email: string; role?: string | null; createdAt: Date | string }
  ip: string | null
}

const LINK_PATTERN = /\bhttps?:\/\/|\bwww\./gi

const isAdmin = (role?: string | null) => Boolean(role) && role !== 'user'

export async function guardComment(input: GuardInput): Promise<GuardResult> {
  const settings = await getSecuritySettings()
  const { user, ip } = input

  // 1. 蜜罐：正常使用者看不到這個欄位，有值就是機器人
  if (settings.filters.honeypot && input.honeypot) return { kind: 'drop' }

  // 管理員不受限流、過濾與審核影響
  if (isAdmin(user.role)) return { kind: 'accept', status: 'approved', flagReason: null }

  // 2. Turnstile（後台開啟、且伺服器有設定 secret 才生效）
  if (settings.filters.turnstile && turnstileEnabled()) {
    if (!(await verifyTurnstile(input.turnstileToken, ip))) {
      return { kind: 'reject', message: '人機驗證失敗，請重新整理後再試一次' }
    }
  }

  // 3. 限流：使用者與 IP 各一組，分鐘與小時各一層
  const limit = rateLimitRules(settings, user.id, ip)
  const rl = consumeRateLimit(limit)
  if (!rl.ok) return { kind: 'reject', message: `留言太頻繁了，請 ${formatRetryAfter(rl.retryAfter)}後再試` }

  // 4. 封鎖清單
  const blocked = await matchBlocklist(input.content, user.email, ip)
  if (blocked === 'ip' || blocked === 'email') return { kind: 'reject', message: '目前無法留言' }
  if (blocked === 'keyword') return { kind: 'accept', status: 'spam', flagReason: 'keyword' }

  // 5. 內容過濾
  const links = input.content.match(LINK_PATTERN)?.length ?? 0
  if (settings.filters.maxLinks > 0 && links > settings.filters.maxLinks) {
    return { kind: 'accept', status: 'spam', flagReason: 'links' }
  }
  if (settings.filters.duplicateWindowHours > 0) {
    const since = new Date(Date.now() - settings.filters.duplicateWindowHours * HOUR)
    const [dup] = await db
      .select({ n: count() })
      .from(comments)
      .where(and(eq(comments.userId, user.id), eq(comments.content, input.content), gte(comments.createdAt, since)))
    if ((dup?.n ?? 0) > 0) return { kind: 'reject', message: '你剛剛已經送出過一樣的留言了' }
  }

  // 6. 信任判斷（A1）
  return { kind: 'accept', ...(await decideStatus(settings, user)) }
}

function rateLimitRules(settings: SecuritySettings, userId: string, ip: string | null) {
  const r = settings.rateLimit
  const rules = [
    { key: `comment:u:${userId}:m`, max: r.commentPerUserPerMinute, windowMs: MINUTE },
    { key: `comment:u:${userId}:h`, max: r.commentPerUserPerHour, windowMs: HOUR },
  ]
  if (ip) {
    rules.push(
      { key: `comment:ip:${ip}:m`, max: r.commentPerIpPerMinute, windowMs: MINUTE },
      { key: `comment:ip:${ip}:h`, max: r.commentPerIpPerHour, windowMs: HOUR }
    )
  }
  return rules
}

/** 按讚限流：每人每分鐘 N 次 */
export async function guardLike(userId: string): Promise<string | null> {
  const settings = await getSecuritySettings()
  const rl = consumeRateLimit([{ key: `like:u:${userId}:m`, max: settings.rateLimit.likePerUserPerMinute, windowMs: MINUTE }])
  return rl.ok ? null : `操作太頻繁了，請 ${formatRetryAfter(rl.retryAfter)}後再試`
}

async function matchBlocklist(content: string, email: string, ip: string | null) {
  const rows = await db
    .select({ type: commentBlocklist.type, value: commentBlocklist.value })
    .from(commentBlocklist)
    .where(inArray(commentBlocklist.type, ['ip', 'email', 'keyword']))
  const lowerContent = content.toLowerCase()
  const lowerEmail = email.trim().toLowerCase()
  for (const row of rows) {
    if (row.type === 'ip' && ip && row.value === ip) return 'ip'
    if (row.type === 'email' && row.value === lowerEmail) return 'email'
  }
  for (const row of rows) {
    if (row.type === 'keyword' && row.value && lowerContent.includes(row.value.toLowerCase())) return 'keyword'
  }
  return null
}

async function decideStatus(
  settings: SecuritySettings,
  user: GuardInput['user']
): Promise<{ status: CommentStatus; flagReason: string | null }> {
  const mode = settings.moderation.mode
  if (mode === 'none') return { status: 'approved', flagReason: null }
  if (mode === 'all') return { status: 'pending', flagReason: null }

  // trusted：帳號夠舊、而且以前有留言被通過過，才自動通過
  const ageHours = (Date.now() - new Date(user.createdAt).getTime()) / HOUR
  if (ageHours < settings.moderation.newAccountHours) return { status: 'pending', flagReason: 'new-account' }

  const [approved] = await db
    .select({ n: count() })
    .from(comments)
    .where(and(eq(comments.userId, user.id), eq(comments.status, 'approved'), eq(comments.deleted, false)))
  if ((approved?.n ?? 0) === 0) return { status: 'pending', flagReason: 'first-comment' }

  return { status: 'approved', flagReason: null }
}
