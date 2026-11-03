import { env } from '@sao-blog/env/server'

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/** 是否啟用：沒有設定 TURNSTILE_SECRET_KEY 時（例如本機開發）一律略過 */
export const turnstileEnabled = () => Boolean(env.TURNSTILE_SECRET_KEY)

/**
 * 驗證前台送來的 Turnstile token。
 * 驗證服務連不上時視為失敗（fail closed），否則對方只要讓驗證逾時就能繞過。
 */
export async function verifyTurnstile(token: string | null | undefined, ip: string | null): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) return true
  if (!token) return false

  const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token })
  if (ip) body.set('remoteip', ip)

  try {
    const res = await fetch(VERIFY_URL, { method: 'POST', body, signal: AbortSignal.timeout(10_000) })
    const data = (await res.json()) as { success?: boolean }
    return data.success === true
  } catch {
    return false
  }
}
