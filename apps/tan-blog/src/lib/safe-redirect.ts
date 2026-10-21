import { env } from '@sao-blog/env/tan-blog'

/**
 * 登入頁的 ?redirect= 只允許導回本站（防 open redirect）。
 *
 * 原本直接 window.location.href = search.redirect，任何人都能做出
 * 「/login?redirect=https://釣魚網站」這種連結：登入後（或已登入時在 beforeLoad）就被帶到外站。
 *
 * 不用字串規則判斷（擋不住 //evil.com、/\evil.com、夾 tab 換行等變形），
 * 而是交給 URL 解析：以本站為 base 解析後，origin 必須是本站才放行，回傳站內路徑。
 * admin 送來的是 window.location.pathname（例如 /admin/posts），正式環境由本站代理到後台。
 */
export function safeRedirect(target: string | null | undefined, fallback = '/'): string {
  if (!target) return fallback
  const allowed = new Set([new URL(env.VITE_SITE_URL).origin])
  if (typeof window !== 'undefined') allowed.add(window.location.origin)

  const base = typeof window !== 'undefined' ? window.location.origin : new URL(env.VITE_SITE_URL).origin
  try {
    const url = new URL(target, base)
    if (!allowed.has(url.origin)) return fallback
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}
