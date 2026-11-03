// 首頁的水墨鳥居（DESIGN.md 第 5 節）：用 2D 畫布一筆一筆畫的明神鳥居，用朱（--zhu）畫。
// 每一部分（笠木、島木、額束、柱、貫）是一筆：先一層暈開的濕邊，再實的墨身，起筆墨飽、收筆漸淡，收筆處有幾道飛白。
// 隨機數有固定的種子，同樣大小畫出來一模一樣——鳥居本身（torii-layer.tsx）和水裡的倒影（water-surface.tsx）各畫一份也對得上。

import { cssRgb } from '@/lib/ink-intro'

/** 鳥居的顏色：朱，從 token 算出來（畫布不吃 CSS 變數） */
export function toriiColor() {
  return '#' + cssRgb('var(--zhu)').map((c) => Math.round(c * 255).toString(16).padStart(2, '0')).join('')
}

export type ToriiBox = {
  /** 柱腳中間（水線上）在畫布裡的位置 */
  cx: number
  base: number
  w: number
  h: number
}

/** 鳥居站在水線上：桌機在右邊，手機縮小靠右；高度不超過水線以上的空間 */
export function toriiBox(hostW: number, waterline: number): ToriiBox {
  // 手機上左邊有名字與標語，鳥居小一點、貼右邊（笠木兩端比柱寬，要留邊）
  const h = Math.max(80, Math.min(waterline - 110, hostW * (hostW >= 768 ? 0.3 : 0.32), 320))
  const w = h * 1.18
  const cx = hostW >= 768 ? Math.min(hostW * 0.7, hostW - w / 2 - 48) : hostW - w * 0.62 - 8
  return { cx, base: waterline, w, h }
}

type Pt = [number, number]

type Part = {
  /** 這一筆的輪廓（以柱腳中間為原點、向上為負）；可以有好幾塊（兩根柱） */
  outline: (W: number, H: number) => Pt[][]
  /** 這一筆的走向：橫筆由左往右、直筆由上往下 */
  dir: 'x' | 'y'
  /** 這一筆在整個畫的過程裡從哪裡畫到哪裡（0–1） */
  from: number
  to: number
}

const quad = (a: Pt, c: Pt, b: Pt, n = 24): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n
    const u = 1 - t
    return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]
  })
const box = (x0: number, y0: number, x1: number, y1: number): Pt[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]

// 筆順：笠木 → 島木 → 兩根柱 → 貫 → 額束
const PARTS: Part[] = [
  {
    // 笠木：兩端往上翹，中間最厚
    outline: (W, H) => [
      [
        ...quad([-0.62 * W, -1.0 * H], [0, -0.9 * H], [0.62 * W, -1.0 * H]),
        ...quad([0.57 * W, -0.945 * H], [0, -0.85 * H], [-0.57 * W, -0.945 * H]),
      ],
    ],
    dir: 'x',
    from: 0,
    to: 0.3,
  },
  { outline: (W, H) => [box(-0.48 * W, -0.865 * H, 0.48 * W, -0.825 * H)], dir: 'x', from: 0.3, to: 0.42 },
  {
    // 柱腳寬、往上收細，微微向內傾
    outline: (W, H) =>
      [-1, 1].map((s): Pt[] => [
        [s * 0.3 * W - 0.032 * W, -0.83 * H],
        [s * 0.3 * W + 0.032 * W, -0.83 * H],
        [s * 0.335 * W + 0.044 * W, 0],
        [s * 0.335 * W - 0.044 * W, 0],
      ]),
    dir: 'y',
    from: 0.42,
    to: 0.74,
  },
  { outline: (W, H) => [box(-0.47 * W, -0.665 * H, 0.47 * W, -0.62 * H)], dir: 'x', from: 0.74, to: 0.88 },
  { outline: (W, H) => [box(-0.04 * W, -0.825 * H, 0.04 * W, -0.665 * H)], dir: 'y', from: 0.88, to: 1 },
]

/** 毛邊：輪廓每隔幾 px 取一點，往外或往內推一點（一點高頻的毛＋一點慢慢起伏），像筆在紙上的邊 */
function roughPath(polys: Pt[][], rand: () => number, amp: number) {
  const p = new Path2D()
  for (const poly of polys) {
    const pts: Pt[] = []
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i]
      const b = poly[(i + 1) % poly.length]
      const len = Math.hypot(b[0] - a[0], b[1] - a[1])
      const n = Math.max(1, Math.round(len / 3))
      const nx = -(b[1] - a[1]) / (len || 1)
      const ny = (b[0] - a[0]) / (len || 1)
      const phase = rand() * 6.28
      for (let k = 0; k < n; k++) {
        const t = k / n
        const off = (rand() - 0.5) * amp + Math.sin(phase + t * 5) * amp * 0.6
        pts.push([a[0] + (b[0] - a[0]) * t + nx * off, a[1] + (b[1] - a[1]) * t + ny * off])
      }
    }
    pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)))
    p.closePath()
  }
  return p
}

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type ToriiArt = {
  /** 整座畫好的鳥居（給倒影用） */
  full: HTMLCanvasElement
  /** 每一筆各自一張，畫的過程用 */
  layers: { canvas: HTMLCanvasElement; part: Part }[]
  /** 畫布左上角在 host 裡的位置、CSS 像素大小、像素比 */
  x: number
  y: number
  w: number
  h: number
  d: number
}

/** 照 box 的大小畫一份鳥居（每一筆一張圖層，再合成一張完整的） */
export function paintTorii(box: ToriiBox, ink: string): ToriiArt {
  const d = Math.min(window.devicePixelRatio || 1, 2)
  const pad = 10
  const w = Math.ceil(box.w * 1.3 + pad * 2)
  const h = Math.ceil(box.h * 1.04 + pad * 2)
  // 原點放在柱腳中間
  const ox = w / 2
  const oy = h - pad
  const rand = rng(Math.round(box.h * 7) + 13)
  const make = () => {
    const c = document.createElement('canvas')
    c.width = Math.round(w * d)
    c.height = Math.round(h * d)
    const ctx = c.getContext('2d')!
    ctx.setTransform(d, 0, 0, d, ox * d, oy * d)
    return [c, ctx] as const
  }

  const layers = PARTS.map((part) => {
    const [canvas, ctx] = make()
    const path = roughPath(part.outline(box.w, box.h), rand, Math.max(1.2, box.h * 0.008))
    // 濕邊：墨在紙上往外暈一點
    ctx.fillStyle = ink
    ctx.globalAlpha = 0.22
    ctx.filter = 'blur(2.5px)'
    ctx.fill(path)
    ctx.filter = 'none'
    // 墨身
    ctx.globalAlpha = 0.9
    ctx.fill(path)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'destination-out'
    // 起筆墨飽、收筆漸淡
    const fade =
      part.dir === 'x'
        ? ctx.createLinearGradient(-0.6 * box.w, 0, 0.6 * box.w, 0)
        : ctx.createLinearGradient(0, -box.h, 0, 0)
    fade.addColorStop(0, 'transparent')
    fade.addColorStop(1, 'black')
    ctx.globalAlpha = 0.32
    ctx.fillStyle = fade
    ctx.fill(path)
    // 飛白：收筆那一段順著筆的走向擦掉幾道細紋
    ctx.save()
    ctx.clip(path)
    const n = part.dir === 'x' ? 22 : 30
    for (let i = 0; i < n; i++) {
      ctx.globalAlpha = 0.35 + rand() * 0.55
      ctx.lineWidth = 0.5 + rand() * 1.1
      ctx.strokeStyle = 'black'
      ctx.beginPath()
      if (part.dir === 'x') {
        const y = -box.h * (0.6 + rand() * 0.4)
        const x0 = box.w * (0.05 + rand() * 0.35)
        ctx.moveTo(x0, y)
        ctx.lineTo(box.w * 0.62, y + (rand() - 0.5) * 2)
      } else {
        const x = (rand() - 0.5) * box.w * 0.9
        const y0 = -box.h * (0.05 + rand() * 0.3)
        ctx.moveTo(x, y0)
        ctx.lineTo(x + (rand() - 0.5) * 2, 2)
      }
      ctx.stroke()
    }
    // 墨的顆粒：細小的點擦淡一點，墨色才不會平得像色塊
    for (let i = 0; i < 260; i++) {
      ctx.globalAlpha = 0.12 + rand() * 0.25
      ctx.fillStyle = 'black'
      ctx.fillRect((rand() - 0.5) * box.w * 1.3, -rand() * box.h * 1.02, 0.6 + rand() * 1.6, 0.6 + rand() * 1.2)
    }
    ctx.restore()
    return { canvas, part }
  })

  const [full, fctx] = make()
  fctx.setTransform(1, 0, 0, 1, 0, 0)
  for (const l of layers) fctx.drawImage(l.canvas, 0, 0)
  return { full, layers, x: box.cx - ox, y: box.base - oy, w, h, d }
}

/** 畫到第 t（0–1）的樣子：每一筆照筆順、照走向一段一段顯出來 */
export function drawToriiAt(ctx: CanvasRenderingContext2D, art: ToriiArt, t: number) {
  for (const { canvas, part } of art.layers) {
    const k = Math.min(1, Math.max(0, (t - part.from) / (part.to - part.from)))
    if (k <= 0) continue
    // 每一筆先快後慢收住
    const e = 1 - Math.pow(1 - k, 2.2)
    const sw = part.dir === 'x' ? canvas.width * e : canvas.width
    const sh = part.dir === 'y' ? canvas.height * e : canvas.height
    ctx.drawImage(canvas, 0, 0, sw, sh, art.x, art.y, sw / art.d, sh / art.d)
  }
}
