// 首頁障子曆的筆觸：每扇障子 100 × 210 單位，框與組子都是乾筆墨線（起筆略頓、收筆出鋒、偶爾斷開），
// 不是等粗的幾何線（DESIGN.md 規則二）。用扇的序號當種子，同一扇每次畫出來都一樣，SSR 與瀏覽器一致。

export const PANE_W = 100
export const PANE_H = 210

const f = (n: number) => n.toFixed(1)

function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

// 一筆橫線：粗細 w，起筆鈍、收筆尖
export function hStroke(x1: number, x2: number, y: number, w: number, r: () => number) {
  const n = 24
  const ph = r() * 6
  const top: string[] = []
  const bottom: string[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const x = x1 + (x2 - x1) * t
    const k = w * Math.min(1, t * 7 + 0.25) * Math.pow(1 - t, 0.4) * (0.75 + 0.25 * Math.sin(ph + t * 11))
    const yy = y + 0.9 * Math.sin(ph + t * 4)
    top.push(`${f(x)},${f(yy - k / 2)}`)
    bottom.push(`${f(x)},${f(yy + k / 2)}`)
  }
  return `M${top.join('L')}L${bottom.reverse().join('L')}Z`
}

// 一筆直線
export function vStroke(x: number, y1: number, y2: number, w: number, r: () => number) {
  const n = 24
  const ph = r() * 6
  const left: string[] = []
  const right: string[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const y = y1 + (y2 - y1) * t
    const k = w * Math.min(1, t * 7 + 0.3) * Math.pow(1 - t, 0.35) * (0.75 + 0.25 * Math.sin(ph + t * 13))
    const xx = x + 0.7 * Math.sin(ph + t * 3)
    left.push(`${f(xx - k / 2)},${f(y)}`)
    right.push(`${f(xx + k / 2)},${f(y)}`)
  }
  return `M${left.join('L')}L${right.reverse().join('L')}Z`
}

export interface PanePaths {
  // 組子：3 直 10 橫，偶爾少畫一根
  kumiko: string[]
  // 框：左右上下四筆
  frame: string[]
}

export function panePaths(seed: number): PanePaths {
  const r = rng(seed * 7 + 3)
  const kumiko: string[] = []
  for (let q = 1; q <= 3; q++) {
    kumiko.push(vStroke((PANE_W * q) / 4, r() * 8, PANE_H - r() * 10, 0.9 + r() * 0.6, r))
  }
  for (let q = 1; q <= 10; q++) {
    const y = (PANE_H * q) / 11
    const a = r() * 6
    const b = PANE_W - r() * 6
    if (r() < 0.12) continue
    kumiko.push(hStroke(a, b, y, 0.7 + r() * 0.6, r))
  }
  const frame = [
    vStroke(1.5, -2, PANE_H + 2, 3.2, r),
    vStroke(PANE_W - 1.5, 0, PANE_H, 3, r),
    hStroke(0, PANE_W, 2, 2.4, r),
    hStroke(0, PANE_W, PANE_H - 2, 2.6, r),
  ]
  return { kumiko, frame }
}

// 鴨居與敷居：橫過整面牆的兩筆（寬 600 單位，兩端淡進紙裡）
export function railPath(seed: number, w: number) {
  const r = rng(seed)
  return hStroke(4, 596, 6, w, r)
}

// 列表標題滑過時的朱色底線（300 × 8 單位，拉伸到標題寬）
export function brushUnderlinePath(seed: number) {
  return hStroke(0, 300, 4, 5, rng(seed + 101))
}

// 晝：窗外一枝楓透在紙上的影子，整面牆一個座標系（600 × 210），每扇只露出自己那一段
const MAPLE = 'M0,0 L-5,-9 L-13,-8 L-8,-15 L-15,-23 L-5,-20 L0,-31 L5,-20 L15,-23 L8,-15 L13,-8 L5,-9Z'
const MAPLE_LEAVES: [number, number, number][] = [
  [350, 59, -20],
  [420, 46, 30],
  [510, 25, -40],
  [460, 76, 10],
  [390, 69, 60],
  [560, 12, 20],
]
export const BRANCH_SHADOW = {
  branch: `M610,-6 Q460,42 340,59 L340,63 Q470,50 610,4Z`,
  twig: `M455,48 Q445,90 462,120 L465,118 Q450,90 459,48Z`,
  leaves: MAPLE_LEAVES.map(([x, y, a]) => ({ d: MAPLE, transform: `translate(${x},${y}) rotate(${a}) scale(1.5)` })),
}
