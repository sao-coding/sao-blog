// 紙紋：事先畫好的纖維圖（無縫拼貼）。只有 alpha：網站用它當 mask，顏色由 CSS token 決定。
// 產生 public/paper-fiber.svg：node scripts/paper-fiber.mjs public/paper-fiber.svg（固定種子，每次產出一樣）
import fs from 'node:fs'
const W = 480
let seed = 20261102
const rnd = () => ((seed = (seed + 0x6d2b79f5) | 0), (() => { let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 })())
const r = (a, b) => a + rnd() * (b - a)
const f = (n) => n.toFixed(1)
const out = []
// 跨邊的纖維在對邊再畫一份，拼起來才無縫
const wrap = (x, y, len, draw) => { for (const dx of [-W, 0, W]) for (const dy of [-W, 0, W]) if (x + dx > -len && x + dx < W + len && y + dy > -len && y + dy < W + len) draw(dx, dy) }
// 長纖維（楮皮）：細、微彎、兩三段
for (let i = 0; i < 140; i++) {
  const x = r(0, W), y = r(0, W), len = r(18, 70), a = r(0, Math.PI * 2)
  const bend = r(-0.5, 0.5), w = r(0.35, 0.9), o = r(0.25, 0.75)
  const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len
  const cx = (x + x2) / 2 + Math.cos(a + Math.PI / 2) * len * bend * 0.5
  const cy = (y + y2) / 2 + Math.sin(a + Math.PI / 2) * len * bend * 0.5
  wrap(x, y, len, (dx, dy) => out.push(`<path d="M${f(x + dx)} ${f(y + dy)}Q${f(cx + dx)} ${f(cy + dy)} ${f(x2 + dx)} ${f(y2 + dy)}" stroke-width="${w.toFixed(2)}" stroke-opacity="${o.toFixed(2)}"/>`))
}
// 短纖維
for (let i = 0; i < 260; i++) {
  const x = r(0, W), y = r(0, W), len = r(3, 12), a = r(0, Math.PI * 2), w = r(0.3, 0.7), o = r(0.2, 0.6)
  wrap(x, y, len, (dx, dy) => out.push(`<path d="M${f(x + dx)} ${f(y + dy)}l${f(Math.cos(a) * len)} ${f(Math.sin(a) * len)}" stroke-width="${w.toFixed(2)}" stroke-opacity="${o.toFixed(2)}"/>`))
}
// 雜點
const dots = []
for (let i = 0; i < 220; i++) {
  const x = r(0, W), y = r(0, W), rad = r(0.3, 1.1), o = r(0.2, 0.7)
  dots.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${rad.toFixed(2)}" fill-opacity="${o.toFixed(2)}"/>`)
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}" viewBox="0 0 ${W} ${W}"><g fill="none" stroke="#000" stroke-linecap="round">${out.join('')}</g><g fill="#000">${dots.join('')}</g></svg>`
fs.writeFileSync(process.argv[2], svg)
console.log(svg.length)
