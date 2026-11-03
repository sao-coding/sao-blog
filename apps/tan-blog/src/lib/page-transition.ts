// 換頁：墨洇（DESIGN.md 第 7 節）。所有換頁都由這一層負責：
// - 舊頁：View Transition 的舊截圖（root）像被水打濕，暈開、淡掉，順著方向微移（styles.css「墨洇」一節）
// - 新頁：活的畫面，標題先出、各行錯開地從暈開的墨收乾（lib/page-enter.ts，由 _layout 在畫出來之前排好）
// - 錨字：列表 ⇄ 內頁時被點的標題自成一層（view-transition-name），不暈，直接移到新位置
// - 篩選、分頁、切語系、不認得的頁、減少動態效果：只淡入（type = fade）
// 方向由 lib/page-depth.ts 算。資料先載好才開始（TanStack Router 在 loader 完成後才呼叫 startViewTransition），
// 不蓋任何疊層，一碰就跳到結果。只在支援 view transition types 的瀏覽器做舊頁那一半，其餘直接換頁、新頁照樣進場。

import { normalizePath, pageMove, type PageMove } from './page-depth'

interface LocationLike {
  pathname: string
  searchStr?: string
}
interface LocationChange {
  fromLocation?: LocationLike
  toLocation: LocationLike
  pathChanged: boolean
  hrefChanged: boolean
}

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// nav 第二欄的順序（同一區的子列表之間照這個排），由 nav 的 usePlaces 填
let childOrder: readonly string[] = []
export function setNavChildOrder(order: readonly string[]) {
  childOrder = order
}

// 點的連結是「下一篇」「上一篇」（rel），算完方向就丟掉
let hint: 'next' | 'prev' | undefined
// 同一次換頁 View Transition 與 _layout 各問一次，答案要一樣
let last: { key: string; move: PageMove } | undefined
export function moveBetween(from: string, to: string): PageMove {
  const key = `${normalizePath(from)}>${normalizePath(to)}`
  if (last?.key === key) return last.move
  const move = pageMove(from, to, { hint, childOrder })
  hint = undefined
  last = { key, move }
  return move
}


export function viewTransitionTypes({ fromLocation, toLocation, pathChanged, hrefChanged }: LocationChange): string[] | false {
  if (!fromLocation || !hrefChanged) return false
  // 剛看完的那一列只在「從那篇離開」這一次掛名字；列表之間換頁時不能帶著，不然那一行會自己移到另一頁
  if (lastAnchor && normalizePath(fromLocation.pathname) !== lastAnchor) lastAnchor = undefined
  // 只換了 #（目錄跳段落）：不是換頁
  if (!pathChanged && fromLocation.searchStr === toLocation.searchStr) return false
  if (reducedMotion() || !pathChanged) return ['fade']
  const move = moveBetween(fromLocation.pathname, toLocation.pathname)
  return move === 'fade' ? ['fade'] : ['ink', `ink-${move}`]
}

export function supportsViewTransitionTypes() {
  return typeof window !== 'undefined' && !!window.CSS?.supports?.('selector(:active-view-transition-type(a))')
}

// 錨字：列表那一列的標題與內頁的 h1 共用 view-transition-name（必須是合法的 CSS 識別字）。
// key 是內頁的路徑（不含語系），例如 /posts/hello、/notes/12、/notes/topics/travel。
export function anchorName(key: string) {
  return `anchor-${key.replace(/[^\w-]/g, '_')}`
}

// 最近看過的內頁：回到列表時，只有那一列帶上名字，標題才移得回去（同名一頁只能一個，不能每一列都掛）
let lastAnchor: string | undefined
export function rememberAnchor(key: string) {
  lastAnchor = key
}

/** 列表那一列的標題：點下去時才掛上名字（見 installPageTransitions 的點擊），剛看完的那一列預先掛著 */
export function anchorProps(key: string) {
  return {
    'data-anchor': key,
    style: lastAnchor === key ? anchorTitleStyle(key) : undefined,
  }
}

/** 內頁的標題：一直掛著 */
export function anchorTitleStyle(key: string) {
  return { viewTransitionName: anchorName(key), viewTransitionClass: 'ink-anchor' }
}

/** 模糊有成本：記憶體或核心少的裝置、觸控的窄螢幕（手機）只淡入、位移，不模糊 */
export function isLowEndDevice() {
  const nav = navigator as Navigator & { deviceMemory?: number }
  if ((nav.deviceMemory ?? 8) < 4 || (nav.hardwareConcurrency ?? 8) < 4) return true
  return matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 640
}

// 轉場進行中使用者一碰螢幕／滾滾輪／按鍵／按上一頁就直接跳到結果：轉場期間看到的是截圖，若同時捲動，
// 底下的頁面在動、截圖裡的標題卻還照原路線移，結束時一跳回實際位置，手機上會像在抖。
// TanStack Router 直接呼叫 document.startViewTransition，所以在這裡包一層記下目前的轉場。
let installed = false
let current: ViewTransition | null = null
let currentAt = 0
export function installPageTransitions() {
  if (installed || typeof document === 'undefined') return
  installed = true
  if (isLowEndDevice()) document.documentElement.dataset.motionLite = ''

  // 點下去的那一刻：列表的標題掛上錨字的名字、記下是不是上一篇／下一篇
  addEventListener(
    'click',
    (e) => {
      const a = (e.target as Element | null)?.closest?.('a[href]')
      if (!(a instanceof HTMLAnchorElement)) return
      const rel = a.relList
      hint = rel.contains('next') ? 'next' : rel.contains('prev') ? 'prev' : undefined
      const holder = a.closest<HTMLElement>('[data-anchor]') ?? a.querySelector<HTMLElement>('[data-anchor]')
      const key = holder?.dataset.anchor
      if (holder && key && normalizePath(a.pathname) === key) {
        holder.style.setProperty('view-transition-name', anchorName(key))
        holder.style.setProperty('view-transition-class', 'ink-anchor')
      }
    },
    true
  )

  if (typeof document.startViewTransition !== 'function') return
  const start = document.startViewTransition.bind(document)
  document.startViewTransition = ((arg?: Parameters<typeof start>[0]) => {
    const transition = start(arg)
    current = transition
    currentAt = performance.now()
    transition.finished.finally(() => {
      if (current === transition) current = null
    })
    return transition
  }) as typeof document.startViewTransition
  const skip = () => current?.skipTransition()
  addEventListener('touchstart', skip, { passive: true })
  addEventListener('wheel', skip, { passive: true })
  addEventListener('pointerdown', skip, { passive: true })
  addEventListener('keydown', skip)
  // 上一頁／下一頁：只跳過按之前就在播的那一次（Router 處理 popstate 時可能已經開始了上一頁這一次的轉場）
  addEventListener('popstate', (e) => {
    if (currentAt < e.timeStamp) skip()
  })
}
