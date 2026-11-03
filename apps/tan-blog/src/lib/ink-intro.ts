import type { InkTheme } from './ink-fluid'

// 進站開場：每次整頁載入（重新整理、從外部連進來）都播，站內換頁不播。沒開「減少動態效果」時，
// <head> 的 INK_INTRO_INIT_SCRIPT 在第一次繪製前替 <html> 加上 data-ink-intro，CSS 先用一層底色＋節氣名
// 蓋住頁面（不會先閃出網站），等 InkIntro 載好流體引擎再接手：墨滴落下暈開，然後被水沖淡、露出網站。

export const INK_INTRO_INIT_SCRIPT = `(function(){try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.dataset.inkIntro=''}catch(e){}})();`

// 開場播到哪裡：首頁水面等開場退掉，再在同一處落一滴接上（DESIGN.md 第 5 節）
let playing = false
let endedAt = -Infinity
const waiters = new Set<() => void>()

/** InkIntro 開始播時傳 true；播完、被跳過、引擎建立失敗時傳 false */
export function markIntro(on: boolean) {
  if (on) {
    playing = true
    return
  }
  if (!playing) return
  playing = false
  endedAt = performance.now()
  for (const w of [...waiters]) w()
  waiters.clear()
}

/** 開場還在播就等它退掉再呼叫 cb；沒有開場就馬上呼叫。回傳取消函式 */
export function whenIntroGone(cb: () => void): () => void {
  if (playing || 'inkIntro' in document.documentElement.dataset) {
    waiters.add(cb)
    return () => waiters.delete(cb)
  }
  cb()
  return () => {}
}

/** 開場還在播就等它退掉再呼叫 cb；剛退掉（兩秒內）就直接呼叫；這次沒有開場就不呼叫。回傳取消函式 */
export function afterIntro(cb: () => void): () => void {
  if (playing || 'inkIntro' in document.documentElement.dataset) {
    waiters.add(cb)
    return () => waiters.delete(cb)
  }
  if (performance.now() - endedAt < 2000) cb()
  return () => {}
}

// 把 CSS 顏色（oklch 等）換成 0~1 的 sRGB
export function cssRgb(css: string): [number, number, number] {
  const probe = document.createElement('span')
  probe.style.color = css
  probe.style.display = 'none'
  document.body.appendChild(probe)
  const resolved = getComputedStyle(probe).color
  probe.remove()
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  if (!ctx) return [0, 0, 0]
  ctx.fillStyle = resolved
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return [r / 255, g / 255, b / 255]
}

export function inkTheme(): InkTheme {
  const dark = document.documentElement.classList.contains('dark')
  const accent = cssRgb('var(--season)')
  const base = cssRgb('var(--background)')
  return dark
    ? // 夜：夜色墨面，邊緣只帶微弱的節氣色光（冬天的點綴色接近白，不能整片刷上去）
      { accent, base, edge: accent.map((c) => c * 0.75) as InkTheme['edge'], edgeK: 0.5, edgeMax: 0.28, accentMix: 0 }
    : // 晝：紙色墨面，墨流邊緣是墨色，間雜節氣色
      { accent, base, edge: cssRgb('var(--foreground)'), edgeK: 0.9, edgeMax: 0.55, accentMix: 0.6 }
}
