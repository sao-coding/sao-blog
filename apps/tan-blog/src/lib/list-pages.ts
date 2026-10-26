// 「庭」這一層（DESIGN.md 第 4 節）：各列表頁。畫層（components/garden）由 _layout 依路徑掛一張，
// 列表頁之間換頁時同一張不重建；內容的進出見 lib/page-enter.ts。

const LIST_PATHS = [
  /^\/posts\/?$/,
  /^\/categories\/[^/]+\/?$/,
  /^\/notes\/?$/,
  /^\/notes\/topics\/?$/,
  /^\/thinking\/?$/,
  /^\/timeline\/?$/,
  /^\/friends\/?$/,
  /^\/fcircle\/?$/,
]

export function isListPath(pathname: string) {
  return LIST_PATHS.some((re) => re.test(pathname))
}

// 首頁 ⇄ 列表、列表 ⇄ 列表都用同一種換頁：舊內容很快淡掉、新內容有編排地進來（首頁的進場由它自己的 hero 負責）
export function isSceneSwap(from: string, to: string) {
  const trim = (p: string) => p.replace(/(.)\/$/, '$1')
  const ok = (p: string) => trim(p) === '/' || isListPath(p)
  return trim(from) !== trim(to) && ok(from) && ok(to)
}

export interface GardenScene {
  stones: boolean
  scene?: 'stepping-stones'
}

// 只有文章列表有石組、朋友圈有飛石，其他列表頁只有砂紋（階段 3、4）
export function gardenFor(pathname: string): GardenScene | null {
  if (!isListPath(pathname)) return null
  if (/^\/posts\/?$/.test(pathname)) return { stones: true }
  if (/^\/fcircle\/?$/.test(pathname)) return { stones: false, scene: 'stepping-stones' }
  return { stones: false }
}
