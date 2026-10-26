// 列表 ⇄ 列表的暈染（DESIGN.md 第 5 節）：點下去的地方滴一滴墨，暈開蓋住舊景，換頁後被水洗淡、露出新景。
// 只在「庭」這一層（各列表頁）之間做；首頁、文章、詳情頁另有轉場或不做。同一路徑只換篩選／分頁時不做。

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

export function shouldInkWash(from: string, to: string) {
  const trim = (p: string) => p.replace(/(.)\/$/, '$1')
  return trim(from) !== trim(to) && isListPath(from) && isListPath(to)
}
