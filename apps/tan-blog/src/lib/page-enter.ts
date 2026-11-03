// 換頁時新頁的進場（DESIGN.md 第 7 節「墨洇」的新頁）：字從暈開的墨收乾變清楚，順著方向移入。
// 標題先出，各行錯開跟上；只動 opacity、filter、translate（styles.css 的 .ink-in）。
// 舊頁的暈開是 View Transition（lib/page-transition.ts）。換頁不等這段動畫：新頁已經在那裡、可以點，只是字還在收乾。
// 數值都從 lib/motion.ts 來。

import { BLUR_MAX_LINES, DURATION, STAGGER, STAGGER_MAX_LINES } from './motion'
import type { PageMove } from './page-depth'

const MAX_ITEMS = 40 // 再往下的行多半在畫面外，不必動
const CLEAN_UP = DURATION.inDelay + STAGGER_MAX_LINES * STAGGER + DURATION.in + 60

// 行：標題的 <header>（沒有就用 <h1>）、各列表的 .ink-row、其他頁標了 data-enter 的區塊（含側欄）、內頁內文的各段
const LINES = '.ink-row, [data-enter], .prose > :not(.mdx-wrapper), .prose > .mdx-wrapper > *'

// 錨字（帶 view-transition-name 的標題）自己移位，不能跟著淡入：含錨字的行拆成子元素，錨字本身跳過
function withoutAnchor(el: HTMLElement, anchor: Element | null): HTMLElement[] {
  if (!anchor || !el.contains(anchor)) return [el]
  if (el === anchor) return []
  return [...el.children].flatMap((c) => (c instanceof HTMLElement ? withoutAnchor(c, anchor) : []))
}

// anchored：這次換頁有 View Transition 在移錨字（不支援的瀏覽器錨字當一般的行）
export function stagePageEnter(root: HTMLElement, move: Exclude<PageMove, 'fade'>, anchored: boolean) {
  const anchor = anchored ? root.querySelector('[style*="view-transition-name"]') : null
  const h1 = root.querySelector('h1')
  const head = h1?.closest('header') ?? h1
  const lines: HTMLElement[] = head ? withoutAnchor(head, anchor) : []
  for (const el of root.querySelectorAll<HTMLElement>(LINES)) {
    if (lines.length >= MAX_ITEMS) break
    if (head?.contains(el) || lines.some((it) => it.contains(el))) continue
    lines.push(...withoutAnchor(el, anchor))
  }
  const items = lines.slice(0, MAX_ITEMS)
  root.dataset.inkMove = move
  items.forEach((el, i) => {
    el.style.setProperty('--enter-delay', `${DURATION.inDelay + Math.min(i, STAGGER_MAX_LINES) * STAGGER}ms`)
    // 同時模糊的行數有上限
    if (i >= BLUR_MAX_LINES) el.style.setProperty('--ink-blur-in', '0px')
    el.classList.add('ink-in')
  })
  // 播完拔掉：之後同一頁換篩選、分頁時行重新掛上，不再重播。一按、滾輪、按鍵、上一頁就直接到結果
  const done = () => {
    window.clearTimeout(timer)
    removeEventListener('pointerdown', done, true)
    removeEventListener('wheel', done)
    removeEventListener('keydown', done, true)
    removeEventListener('popstate', done)
    delete root.dataset.inkMove
    for (const el of items) {
      el.classList.remove('ink-in')
      el.style.removeProperty('--enter-delay')
      el.style.removeProperty('--ink-blur-in')
    }
  }
  const timer = window.setTimeout(done, CLEAN_UP)
  addEventListener('pointerdown', done, true)
  addEventListener('wheel', done, { passive: true })
  addEventListener('keydown', done, true)
  addEventListener('popstate', done)
  return done
}
