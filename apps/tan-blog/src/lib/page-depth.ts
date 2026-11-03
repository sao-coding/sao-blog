// 換頁的方向（DESIGN.md 第 7 節「方向」）：每一頁有深度與所屬的區，從 from／to 算出字往哪裡走。
// - 深度不同：往深處字往下落（down）、回淺處字往上（up）
// - 同一深度、不同區：照 nav 的順序，往右邊的區字往左走（left）、反過來往右（right）
// - 同一區、同一深度：子列表照 nav 第二欄的順序；內頁之間下一篇往左、上一篇往右
// - 同一頁（篩選、分頁、切語系）或不認得的頁：只淡入（fade）
// 純函式，不碰 DOM，page-depth.test.ts 直接測。

export type PageMove = 'left' | 'right' | 'down' | 'up' | 'fade'

export interface PagePlace {
  /** 1 = nav 第一欄的各區、2 = 子列表、3 = 內頁 */
  depth: 1 | 2 | 3
  /** 所屬的區在 nav 第一欄的位置（nav 的 usePlaces 同一個順序） */
  section: number
  /** 去掉語系前綴、結尾斜線的路徑 */
  path: string
}

// 首頁、文章、日記（含專欄）、想法、時間線、友鏈（含朋友圈）
export const SECTIONS = ['/', '/posts', '/notes', '/thinking', '/timeline', '/friends'] as const

// 非預設語系的網址前綴（project.inlang/settings.json 的 locales，zh-Hant 是預設、沒有前綴）
const LOCALE_PREFIX = /^\/(?:en|ja)(?=\/|$)/

export function normalizePath(pathname: string) {
  const path = pathname.split(/[?#]/)[0].replace(LOCALE_PREFIX, '').replace(/\/+$/, '')
  return path === '' ? '/' : path
}

const RULES: Array<[RegExp, PagePlace['depth'], number]> = [
  [/^\/$/, 1, 0],
  [/^\/posts$/, 1, 1],
  [/^\/categories(?:\/[^/]+)?$/, 2, 1],
  [/^\/posts\/[^/]+$/, 3, 1],
  [/^\/notes$/, 1, 2],
  [/^\/notes\/topics(?:\/[^/]+)?$/, 2, 2],
  [/^\/notes\/[^/]+$/, 3, 2],
  [/^\/thinking$/, 1, 3],
  [/^\/timeline$/, 1, 4],
  [/^\/friends$/, 1, 5],
  [/^\/fcircle$/, 2, 5],
]

export function placeOf(pathname: string): PagePlace | null {
  const path = normalizePath(pathname)
  for (const [re, depth, section] of RULES) {
    if (re.test(path)) return { depth, section, path }
  }
  return null
}

export interface PageMoveOptions {
  /** 點的是「下一篇」「上一篇」（連結的 rel） */
  hint?: 'next' | 'prev'
  /** nav 第二欄的順序（各區子項目的 href 依序攤平），同一區的子列表之間照這個排 */
  childOrder?: readonly string[]
}

const sign = (n: number): PageMove => (n > 0 ? 'left' : 'right')

export function pageMove(from: string, to: string, opts: PageMoveOptions = {}): PageMove {
  const a = placeOf(from)
  const b = placeOf(to)
  if (!a || !b || a.path === b.path) return 'fade'
  if (a.depth !== b.depth) return b.depth > a.depth ? 'down' : 'up'
  if (a.section !== b.section) return sign(b.section - a.section)
  if (a.depth === 3) {
    if (opts.hint) return opts.hint === 'next' ? 'left' : 'right'
    // 日記的 id 是流水號：比較新的那篇就是下一篇
    const x = Number(a.path.split('/').pop())
    const y = Number(b.path.split('/').pop())
    if (Number.isFinite(x) && Number.isFinite(y) && x !== y) return sign(y - x)
    return 'left'
  }
  const order = opts.childOrder ?? []
  const i = order.indexOf(a.path)
  const j = order.indexOf(b.path)
  if (i >= 0 && j >= 0 && i !== j) return sign(j - i)
  return 'left'
}
