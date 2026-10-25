// 文章換頁的 View Transitions（動畫本身在 styles.css 的「展卷」一節）：
// - 進入文章（unroll）：點到的那列標題飛到文章頁的標題位置，內文像手卷由上往下展開
// - 回到列表（roll-up）：標題飛回原本那一列，列表由下往上捲開
// - 文章之間（turn-page）：像翻過一頁紙
// 其他換頁不做轉場。只在支援 view transition types 的瀏覽器啟用，其餘直接換頁。

const POST_PATH = /^\/posts\/[^/]+\/?$/

interface LocationChange {
  fromLocation?: { pathname: string }
  toLocation: { pathname: string }
  pathChanged: boolean
}

export function postTransitionTypes({ fromLocation, toLocation, pathChanged }: LocationChange): string[] | false {
  if (!pathChanged || !fromLocation) return false
  const fromPost = POST_PATH.test(fromLocation.pathname)
  const toPost = POST_PATH.test(toLocation.pathname)
  if (fromPost && toPost) return ['turn-page']
  if (toPost) return ['unroll']
  if (fromPost) return ['roll-up']
  return false
}

export function supportsPostTransitions() {
  return typeof window !== 'undefined' && !!window.CSS?.supports?.('selector(:active-view-transition-type(a))')
}

// 列表那一列與文章頁標題共用的 view-transition-name（必須是合法的 CSS 識別字）
export function postTitleTransitionName(slug: string) {
  return `post-title-${slug.replace(/[^\w-]/g, '_')}`
}

// 最近看過的文章：回到列表時，只有那一列帶上 view-transition-name，標題才飛得回去
// （同名的元素一頁只能有一個，不能每一列都掛）
let lastViewedPost: string | undefined
export function rememberViewedPost(slug: string) {
  lastViewedPost = slug
}
export function isLastViewedPost(slug: string) {
  return lastViewedPost === slug
}
