import type { InkTheme } from './ink-fluid'

// 進站開場：每次整頁載入（重新整理、從外部連進來）都播，站內換頁不播。沒開「減少動態效果」時，
// <head> 的 INK_INTRO_INIT_SCRIPT 在第一次繪製前替 <html> 加上 data-ink-intro，CSS 先用一層底色＋節氣名
// 蓋住頁面（不會先閃出網站），等 InkIntro 載好流體引擎再接手：墨滴落下暈開，然後被水沖淡、露出網站。

export const INK_INTRO_INIT_SCRIPT = `(function(){try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.dataset.inkIntro=''}catch(e){}})();`

// 把 CSS 顏色（oklch 等）換成 0~1 的 sRGB
function cssRgb(css: string): [number, number, number] {
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
