// 列表 ⇄ 列表換頁時新內容的進場（DESIGN.md 第 5 節）：背景（庭、header）不動，只有字層有編排地進來。
// 標題先出，列表一行一行跟上；只用 opacity 與小幅位移（styles.css 的 .page-enter）。
// 舊內容的淡出是 View Transition（type = list，見 post-transitions.ts）。
// 換頁不等這段動畫：新頁已經在那裡、可以點，只是字還在浮上來。

const FIRST_ROW = 50 // 標題出來後，第一行晚這麼多才跟上（ms）
const STEP = 32 // 每行間隔（ms）
const MAX_STEPS = 5 // 第 6 行以後一起出來，整體 < 400ms
const MAX_ITEMS = 40 // 再往下的列多半在畫面外，不必動
const CLEAN_UP = 500

// 列：標題的 <header>（沒有就用 <h1>）、側欄（data-enter="aside"，跟第一行一起）、各列表的 .ink-row，
// 以及其他頁標了 data-enter 的區塊
export function stagePageEnter(root: HTMLElement) {
  const h1 = root.querySelector('h1')
  const head = h1?.closest('header') ?? h1
  const aside = root.querySelector<HTMLElement>('[data-enter="aside"]')
  const rows: HTMLElement[] = []
  for (const el of root.querySelectorAll<HTMLElement>('.ink-row, [data-enter]:not([data-enter="aside"])')) {
    if (rows.length >= MAX_ITEMS) break
    if (head?.contains(el) || rows.some((it) => it.contains(el))) continue
    rows.push(el)
  }
  const stage = (el: HTMLElement, delay: number) => {
    el.style.setProperty('--enter-delay', `${delay}ms`)
    el.classList.add('page-enter')
  }
  if (head) stage(head, 0)
  if (aside) stage(aside, FIRST_ROW)
  rows.forEach((el, i) => stage(el, FIRST_ROW + Math.min(i, MAX_STEPS) * STEP))
  const items = [head, aside, ...rows].filter((el): el is HTMLElement => !!el)
  // 播完拔掉：之後同一頁換篩選、分頁時列重新掛上，不再重播。一按、滾輪、按鍵就直接到結果
  const done = () => {
    window.clearTimeout(timer)
    removeEventListener('pointerdown', done, true)
    removeEventListener('wheel', done)
    removeEventListener('keydown', done, true)
    for (const el of items) {
      el.classList.remove('page-enter')
      el.style.removeProperty('--enter-delay')
    }
  }
  const timer = window.setTimeout(done, CLEAN_UP)
  addEventListener('pointerdown', done, true)
  addEventListener('wheel', done, { passive: true })
  addEventListener('keydown', done, true)
  return done
}
