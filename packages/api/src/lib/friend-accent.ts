import sharp from 'sharp'
import { db } from '@sao-blog/db'
import { friends } from '@sao-blog/db/schema/index'
import { and, eq, isNull } from 'drizzle-orm'
import { sanitizePublicUrl } from './friend-url'

// 友鏈卡片的主色。不截圖（要跑 headless 瀏覽器，太重），改用兩個便宜的來源：
// 1. 對方首頁的 <meta name="theme-color">：站長自己選的品牌色，最準
// 2. 頭像的主色（sharp 的 dominant），頭像本來就要顯示，只多抓一次
// 都拿不到就存空字串（代表「找過了、沒有」，不會一直重試），前台退回用站名算出的顏色。

const TIMEOUT_MS = 5_000
const MAX_BYTES = 2 * 1024 * 1024
const UA = 'Mozilla/5.0 (compatible; SaoBlogBot/1.0)'

const hex2 = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
const toHex = (r: number, g: number, b: number) => `#${hex2(r)}${hex2(g)}${hex2(b)}`

/** 把 theme-color 的值（#rgb、#rrggbb、rgb()）轉成 #rrggbb；其他格式（色名、hsl…）不處理 */
function normalizeColor(raw: string): string | null {
  const v = raw.trim().toLowerCase()
  let m = v.match(/^#([0-9a-f]{3})$/)
  if (m) return `#${[...m[1]!].map((c) => c + c).join('')}`
  m = v.match(/^#([0-9a-f]{6})(?:[0-9a-f]{2})?$/)
  if (m) return `#${m[1]}`
  m = v.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/)
  if (m) return toHex(Number(m[1]), Number(m[2]), Number(m[3]))
  return null
}

/** 太接近黑或白的顏色當光暈沒有意義 */
function usable(hex: string): boolean {
  const r = Number.parseInt(hex.slice(1, 3), 16)
  const g = Number.parseInt(hex.slice(3, 5), 16)
  const b = Number.parseInt(hex.slice(5, 7), 16)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const lightness = (max + min) / 2 / 255
  const saturation = max === min ? 0 : (max - min) / 255
  return lightness > 0.08 && lightness < 0.95 && saturation > 0.08
}

async function fetchLimited(url: string): Promise<Response | null> {
  const safe = sanitizePublicUrl(url)
  if (!safe) return null
  const res = await fetch(safe, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!res.ok) return null
  if (Number(res.headers.get('content-length')) > MAX_BYTES) return null
  return res
}

async function themeColorOf(siteUrl: string): Promise<string | null> {
  const res = await fetchLimited(siteUrl)
  if (!res) return null
  const html = (await res.text()).slice(0, 200_000)
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    if (!/name\s*=\s*["']theme-color["']/i.test(tag)) continue
    // 有多個（分深淺色）時取第一個可用的
    const content = tag.match(/content\s*=\s*["']([^"']+)["']/i)?.[1]
    const color = content ? normalizeColor(content) : null
    if (color && usable(color)) return color
  }
  return null
}

async function avatarColorOf(avatarUrl: string): Promise<string | null> {
  const res = await fetchLimited(avatarUrl)
  if (!res) return null
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length > MAX_BYTES) return null
  // 縮小再算；透明背景先鋪成中性灰，避免透明區被當成黑色主色
  const { dominant } = await sharp(buf, { limitInputPixels: 4096 * 4096 })
    .resize(64, 64, { fit: 'inside' })
    .flatten({ background: '#808080' })
    .stats()
  const color = toHex(dominant.r, dominant.g, dominant.b)
  return usable(color) ? color : null
}

export async function extractAccentColor(siteUrl: string, avatarUrl: string | null): Promise<string | null> {
  try {
    const theme = await themeColorOf(siteUrl)
    if (theme) return theme
  } catch {
    // 首頁抓不到就改看頭像
  }
  if (!avatarUrl) return null
  try {
    return await avatarColorOf(avatarUrl)
  } catch {
    return null
  }
}

/** 背景計算並寫入；不阻塞呼叫端（審核、編輯的回應不用等它） */
export function refreshAccentColorInBackground(friend: { id: string; url: string; avatar: string | null }) {
  void (async () => {
    const color = await extractAccentColor(friend.url, friend.avatar)
    await db.update(friends).set({ accentColor: color ?? '' }).where(eq(friends.id, friend.id))
  })().catch((err) => console.error('[friend-accent] 取色失敗：', friend.url, err))
}

/** 補上還沒有主色的已通過友鏈（聚合器寫回時順便跑，每次最多幾個） */
export async function backfillAccentColors(limit = 5) {
  const missing = await db
    .select({ id: friends.id, url: friends.url, avatar: friends.avatar })
    .from(friends)
    .where(and(eq(friends.status, 'approved'), isNull(friends.accentColor)))
    .limit(limit)
  for (const f of missing) refreshAccentColorInBackground(f)
}
