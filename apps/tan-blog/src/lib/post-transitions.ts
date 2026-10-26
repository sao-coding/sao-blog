// 文章換頁的 View Transitions（動畫本身在 styles.css 的「展卷」一節）：
// - 進入文章（unroll）：點到的那列標題飛到文章頁的標題位置，內文像手卷由上往下展開
// - 回到列表（roll-up）：標題飛回原本那一列，列表由下往上捲開
// - 文章之間（turn-page）：像翻過一頁紙
// 其他換頁不做轉場（列表之間的暈染、首頁推近另有 components/ink-wash.tsx、ink-push.tsx）；減少動態效果時所有換頁只淡入。只在支援 view transition types 的瀏覽器啟用，其餘直接換頁。

const POST_PATH = /^\/posts\/[^/]+\/?$/

interface LocationChange {
  fromLocation?: { pathname: string }
  toLocation: { pathname: string }
  pathChanged: boolean
}

export function postTransitionTypes({ fromLocation, toLocation, pathChanged }: LocationChange): string[] | false {
  if (!pathChanged || !fromLocation) return false
  // 減少動態效果：每次換頁都只淡入（暈染、推近這時不攔，換頁照樣走到這裡）
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return ['fade']
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

// 轉場進行中使用者一碰螢幕／滾滾輪／按鍵就直接跳到結果：轉場期間看到的是截圖，若同時捲動，
// 底下的頁面在動、截圖裡的標題卻還照原路線飛，結束時一跳回實際位置，手機上會像在抖。
// TanStack Router 直接呼叫 document.startViewTransition，所以在這裡包一層記下目前的轉場。
let guarded = false
let current: ViewTransition | null = null
// 展卷／翻頁正在播：暈染、推近這時不攔，直接換頁（View Transition 的畫面在最上層，墨會被蓋在底下）
export function isPostTransitionActive() {
  return current !== null
}
export function installTransitionInterruptGuard() {
  if (guarded || typeof document === 'undefined' || typeof document.startViewTransition !== 'function') return
  guarded = true
  const start = document.startViewTransition.bind(document)
  document.startViewTransition = ((arg?: Parameters<typeof start>[0]) => {
    const transition = start(arg)
    current = transition
    transition.finished.finally(() => {
      if (current === transition) current = null
    })
    return transition
  }) as typeof document.startViewTransition
  const skip = () => current?.skipTransition()
  window.addEventListener('touchstart', skip, { passive: true })
  window.addEventListener('wheel', skip, { passive: true })
  window.addEventListener('pointerdown', skip, { passive: true })
  window.addEventListener('keydown', skip)
}
