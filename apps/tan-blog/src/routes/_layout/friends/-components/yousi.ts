// 游絲（DESIGN.md 第 0 節「乾筆線」的延伸）：一筆橫貫一排的長波浪細墨，朋友的頭像像珠子串在上面。
// 這裡只放純計算：穿過頭像的平滑曲線（through）與沿線算出有筆壓的一筆墨（brush）。畫在 friend-list.tsx。
// 形狀由種子決定，每次畫出來一樣。

export function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

export function rng(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), a | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const f1 = (n: number) => n.toFixed(1)

/**
 * 沿著一條線（點列）算出一筆墨的輪廓：兩端提筆變細，中間有幾處按下去變粗、幾處只剩一絲，
 * 粗細只慢慢變，線本身是順的。回傳填色用的 d，和中線（寫出來的遮罩用）。
 */
export function brush(pts: { x: number; y: number }[], seed: string) {
  const r = rng(hash(`${seed}:brush`))
  const n = pts.length - 1
  let len = 0
  const at = pts.map((p, i) => (i === 0 ? 0 : (len += Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y))))
  const ph = [r() * 6.3, r() * 6.3]
  const wl = [90 + r() * 70, 37 + r() * 20]
  const left: string[] = []
  const right: string[] = []
  pts.forEach((p, i) => {
    const t = at[i] / len
    const q = pts[Math.min(n, i + 1)]
    const o = pts[Math.max(0, i - 1)]
    const tl = Math.hypot(q.x - o.x, q.y - o.y) || 1
    const nx = -(q.y - o.y) / tl
    const ny = (q.x - o.x) / tl
    // 筆壓：慢的起伏決定哪裡按下去；兩端提筆
    const press = Math.max(0, Math.sin(ph[0] + at[i] / wl[0])) ** 2 * 1.6 + 0.25 * Math.sin(ph[1] + at[i] / wl[1])
    const lift = Math.min(1, t * 9, (1 - t) * 9)
    const w = Math.max(0.4, (0.9 + press * 1.3) * lift)
    left.push(`${f1(p.x + (nx * w) / 2)} ${f1(p.y + (ny * w) / 2)}`)
    right.push(`${f1(p.x - (nx * w) / 2)} ${f1(p.y - (ny * w) / 2)}`)
  })
  return {
    ink: `M${left.join('L')}L${right.reverse().join('L')}Z`,
    center: `M${pts.map((p) => `${f1(p.x)} ${f1(p.y)}`).join('L')}`,
  }
}

/** 穿過每一點的平滑曲線（Catmull-Rom），每隔 step px 取一點，給 brush 用 */
export function through(points: { x: number; y: number }[], step = 3) {
  const p = [points[0], ...points, points.at(-1)!]
  const out: { x: number; y: number }[] = []
  for (let i = 1; i < p.length - 2; i++) {
    const [p0, p1, p2, p3] = [p[i - 1], p[i], p[i + 1], p[i + 2]]
    const n = Math.max(2, Math.ceil(Math.hypot(p2.x - p1.x, p2.y - p1.y) / step))
    for (let k = 0; k < n; k++) {
      const t = k / n
      const t2 = t * t
      const t3 = t2 * t
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) })
    }
  }
  out.push(points.at(-1)!)
  return out
}
