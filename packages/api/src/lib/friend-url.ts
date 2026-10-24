/**
 * 友鏈網址正規化與檢查。網址來自公開表單，存之前一律過這裡：
 * - 只收 http / https（擋 javascript: / data: 等）
 * - 拒絕 localhost、內網與保留位址（之後聚合器會去抓 feed，避免 SSRF）
 * - 首頁去掉 query / hash 與結尾的 /，主機名轉小寫，作為 unique 比對的鍵
 */

const PRIVATE_V4 = [
  /^0\./,
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // CGNAT
]

function isPublicHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (!h || h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return false
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) return !PRIVATE_V4.some((re) => re.test(h))
  if (h.includes(':')) {
    // IPv6：擋迴環、未指定、ULA、link-local、IPv4-mapped
    return !(h === '::1' || h === '::' || /^f[cd]/.test(h) || /^fe[89ab]/.test(h) || h.startsWith('::ffff:'))
  }
  // 沒有點的主機名（例如 intranet）不算公開網址
  return h.includes('.')
}

/** 一般網址（頭像、feed、友鏈頁）：合法就回傳標準化字串，否則 null */
export function sanitizePublicUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  try {
    const url = new URL(raw.trim())
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (url.username || url.password) return null
    if (!isPublicHost(url.hostname)) return null
    url.hash = ''
    return url.toString()
  } catch {
    return null
  }
}

/** 首頁網址：額外去掉 query 與結尾的 /，用來判斷是否重複申請 */
export function normalizeSiteUrl(raw: string | null | undefined): string | null {
  const safe = sanitizePublicUrl(raw)
  if (!safe) return null
  const url = new URL(safe)
  url.search = ''
  return `${url.protocol}//${url.host}${url.pathname.replace(/\/+$/, '')}`
}
