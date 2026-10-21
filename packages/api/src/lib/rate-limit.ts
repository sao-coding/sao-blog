/**
 * 記憶體內的固定視窗限流（單一伺服器）。
 *
 * 目前 API 只有一台，存在記憶體最簡單、也最快；之後要多台再換成 Redis。
 * 伺服器重啟會清空計數，對擋洗版來說可以接受。
 */

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

// 定期清掉過期的計數，避免 Map 無限長大
setInterval(() => {
  const now = Date.now()
  for (const [key, b] of buckets) if (b.resetAt <= now) buckets.delete(key)
}, 60_000).unref?.()

export interface RateLimitRule {
  /** 計數用的 key，例如 `comment:user:<id>:minute` */
  key: string
  max: number
  windowMs: number
}

export interface RateLimitResult {
  ok: boolean
  /** 被擋時，多久後可以再試（秒） */
  retryAfter: number
}

/**
 * 一次檢查多條規則；全部通過才會一起計數（被擋的請求不吃額度）。
 */
export function consumeRateLimit(rules: RateLimitRule[]): RateLimitResult {
  const now = Date.now()
  for (const rule of rules) {
    const b = buckets.get(rule.key)
    if (b && b.resetAt > now && b.count >= rule.max) {
      return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) }
    }
  }
  for (const rule of rules) {
    const b = buckets.get(rule.key)
    if (!b || b.resetAt <= now) buckets.set(rule.key, { count: 1, resetAt: now + rule.windowMs })
    else b.count++
  }
  return { ok: true, retryAfter: 0 }
}

export const MINUTE = 60_000
export const HOUR = 60 * MINUTE

/** 「3 分鐘後」這種給人看的等待時間 */
export function formatRetryAfter(seconds: number): string {
  if (seconds < 60) return `${seconds} 秒`
  return `${Math.ceil(seconds / 60)} 分鐘`
}
