import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from './index'
import { appSettings } from './schema'

// 後台「留言與安全」設定。存在 app_settings（key = 'security'）的 JSON，
// 讀取時與預設值合併，所以之後新增欄位不需要 migration；缺的欄位自動用預設值。
// auth（登入限流）與 api（留言）都會讀，所以放在 db 套件、兩邊共用。

export const securitySettingsSchema = z.object({
  moderation: z.object({
    /**
     * trusted：曾有留言被通過、且帳號滿 newAccountHours 的使用者自動通過，其餘待審（A1）
     * all：每則都要審核
     * none：全部直接公開（仍會經過過濾與限流）
     */
    mode: z.enum(['trusted', 'all', 'none']),
    /** 註冊未滿幾小時的帳號，留言一律待審 */
    newAccountHours: z.number().int().min(0).max(24 * 30),
  }),
  filters: z.object({
    /** 一則留言最多幾個連結，超過標成垃圾（0 = 不限制） */
    maxLinks: z.number().int().min(0).max(50),
    /** 同一人在幾小時內貼完全相同的內容會被擋（0 = 不檢查） */
    duplicateWindowHours: z.number().int().min(0).max(24 * 30),
    /** 隱藏欄位：機器人會把它填起來 */
    honeypot: z.boolean(),
    /** 留言是否要通過 Cloudflare Turnstile（還需要設定 TURNSTILE_SECRET_KEY 才會生效） */
    turnstile: z.boolean(),
  }),
  rateLimit: z.object({
    commentPerUserPerMinute: z.number().int().min(1).max(1000),
    commentPerUserPerHour: z.number().int().min(1).max(10000),
    commentPerIpPerMinute: z.number().int().min(1).max(1000),
    commentPerIpPerHour: z.number().int().min(1).max(10000),
    likePerUserPerMinute: z.number().int().min(1).max(1000),
    /** 登入（帳密）每個 IP 每分鐘幾次，擋暴力破解 */
    signInPerIpPerMinute: z.number().int().min(1).max(100),
  }),
})

export type SecuritySettings = z.infer<typeof securitySettingsSchema>

export const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  moderation: { mode: 'trusted', newAccountHours: 24 },
  filters: { maxLinks: 2, duplicateWindowHours: 24, honeypot: true, turnstile: true },
  rateLimit: {
    commentPerUserPerMinute: 3,
    commentPerUserPerHour: 20,
    commentPerIpPerMinute: 5,
    commentPerIpPerHour: 30,
    likePerUserPerMinute: 30,
    signInPerIpPerMinute: 5,
  },
}

const KEY = 'security'
const CACHE_MS = 30_000

let cache: { value: SecuritySettings; at: number } | null = null

/** 深層合併：存的 JSON 只有部分欄位時，其餘用預設值 */
function withDefaults(stored: unknown): SecuritySettings {
  const s = (stored ?? {}) as Partial<Record<keyof SecuritySettings, object>>
  const merged = {
    moderation: { ...DEFAULT_SECURITY_SETTINGS.moderation, ...s.moderation },
    filters: { ...DEFAULT_SECURITY_SETTINGS.filters, ...s.filters },
    rateLimit: { ...DEFAULT_SECURITY_SETTINGS.rateLimit, ...s.rateLimit },
  }
  const parsed = securitySettingsSchema.safeParse(merged)
  return parsed.success ? parsed.data : DEFAULT_SECURITY_SETTINGS
}

/**
 * 讀取設定（快取 30 秒；登入限流每個請求都會呼叫，不能每次打 DB）。
 * 讀取失敗（例如還沒跑 migration）時回傳預設值，不讓登入或留言整個掛掉。
 */
export async function getSecuritySettings(): Promise<SecuritySettings> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value
  try {
    const [row] = await db.select().from(appSettings).where(eq(appSettings.key, KEY)).limit(1)
    const value = withDefaults(row?.value)
    cache = { value, at: Date.now() }
    return value
  } catch {
    return cache?.value ?? DEFAULT_SECURITY_SETTINGS
  }
}

export async function saveSecuritySettings(value: SecuritySettings): Promise<SecuritySettings> {
  const parsed = securitySettingsSchema.parse(value)
  await db
    .insert(appSettings)
    .values({ key: KEY, value: parsed, updatedAt: new Date() })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: parsed, updatedAt: new Date() } })
  cache = { value: parsed, at: Date.now() }
  return parsed
}
