// 揉過又攤開的紙（想法頁最新一則的底，2026-11-02 站主要的）。
// 不用光影、陰影、漸層：整張紙拆成一片片不規則的小面（隨機撒點、Delaunay 三角化），每一面只是紙色上平塗一層很淡的墨，
// 濃淡由每個點的高低起伏算出來（朝左上的面亮、背光的面暗）；明暗差得多的兩面之間畫一道極淡的摺痕，
// 再加兩道揉之前先對折過的主摺痕。紙邊沿路有一點起伏，不是直的。
// 形狀由 seed（那一則的 id）決定，SSR 與瀏覽器畫出來一樣；畫在 260×100 上，再拉成元素的大小。

const W = 260
const H = 100
/** 紙邊每隔多遠一個點 */
const EDGE_STEP = 16
/** 裡面撒幾個點、彼此至少隔多遠 */
const INNER = 70
const MIN_GAP = 11
/** 一面最暗多少墨 */
const FACE_MAX = 0.055
/** 摺痕最濃多少墨 */
const CREASE_MAX = 0.14

type P = { x: number; y: number; z: number }
type Tri = [number, number, number]

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

function rng(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), a | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Bowyer–Watson：點不多（一百個上下），直接做就好
function delaunay(pts: P[]): Tri[] {
  const big = [{ x: -1e4, y: -1e4, z: 0 }, { x: 1e4, y: -1e4, z: 0 }, { x: 0, y: 1e4, z: 0 }]
  const all = [...pts, ...big]
  const n = pts.length
  let tris: Tri[] = [[n, n + 1, n + 2]]
  const circum = ([a, b, c]: Tri) => {
    const A = all[a], B = all[b], C = all[c]
    const d = 2 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y))
    const a2 = A.x * A.x + A.y * A.y, b2 = B.x * B.x + B.y * B.y, c2 = C.x * C.x + C.y * C.y
    const x = (a2 * (B.y - C.y) + b2 * (C.y - A.y) + c2 * (A.y - B.y)) / d
    const y = (a2 * (C.x - B.x) + b2 * (A.x - C.x) + c2 * (B.x - A.x)) / d
    return { x, y, r: (A.x - x) ** 2 + (A.y - y) ** 2 }
  }
  for (let i = 0; i < n; i++) {
    const p = all[i]
    const bad: Tri[] = [], keep: Tri[] = []
    for (const t of tris) {
      const c = circum(t)
      ;((p.x - c.x) ** 2 + (p.y - c.y) ** 2 < c.r ? bad : keep).push(t)
    }
    const edges = new Map<string, [number, number]>()
    for (const [a, b, c] of bad) {
      for (const [u, v] of [[a, b], [b, c], [c, a]] as const) {
        const k = u < v ? `${u},${v}` : `${v},${u}`
        if (edges.has(k)) edges.delete(k)
        else edges.set(k, [u, v])
      }
    }
    tris = keep
    for (const [u, v] of edges.values()) tris.push([u, v, i])
  }
  return tris.filter((t) => t.every((i) => i < n))
}

// 朝左上、稍微從上方來的光
const LIGHT = (() => {
  const v = [-0.55, -0.7, 1]
  const len = Math.hypot(...v)
  return v.map((c) => c / len)
})()

function shade(a: P, b: P, c: P) {
  const ux = b.x - a.x, uy = b.y - a.y, uz = (b.z - a.z) * 9
  const vx = c.x - a.x, vy = c.y - a.y, vz = (c.z - a.z) * 9
  let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx
  if (nz < 0) { nx = -nx; ny = -ny; nz = -nz }
  return (nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) / Math.hypot(nx, ny, nz)
}

const f = (n: number) => n.toFixed(1)

function build(seed: string) {
  const r = rng(hash(seed))
  const pts: P[] = []
  // 紙邊：沿著四邊每隔一段一個點，往內外推一點
  const edge: P[] = []
  const side = (x0: number, y0: number, x1: number, y1: number) => {
    const len = Math.hypot(x1 - x0, y1 - y0)
    const steps = Math.round(len / EDGE_STEP)
    const nx = -(y1 - y0) / len, ny = (x1 - x0) / len
    for (let s = 0; s < steps; s++) {
      const t = s / steps + (s ? (r() - 0.5) * 0.3 / steps : 0)
      const push = s ? (r() - 0.5) * 2.4 : (r() - 0.5) * 1.2
      edge.push({ x: x0 + (x1 - x0) * t + nx * push, y: y0 + (y1 - y0) * t + ny * push, z: r() * 0.35 })
    }
  }
  side(0, 0, W, 0)
  side(W, 0, W, H)
  side(W, H, 0, H)
  side(0, H, 0, 0)
  pts.push(...edge)
  // 裡面：隨機撒點，太近的不要
  for (let tries = 0; pts.length < edge.length + INNER && tries < 4000; tries++) {
    const p = { x: 4 + r() * (W - 8), y: 4 + r() * (H - 8), z: r() }
    if (pts.every((q) => (q.x - p.x) ** 2 + (q.y - p.y) ** 2 > MIN_GAP * MIN_GAP)) pts.push(p)
  }
  // 揉之前對折過兩次：折線兩邊的點一高一低，摺痕就會順著它走
  const foldX = W * (0.38 + r() * 0.24)
  const foldY = H * (0.4 + r() * 0.2)
  for (const p of pts) {
    const dx = Math.abs(p.x - foldX) / W, dy = Math.abs(p.y - foldY) / H
    if (dx < 0.06) p.z = Math.min(1, p.z + 0.5)
    if (dy < 0.08) p.z = Math.max(0, p.z - 0.4)
  }

  const tris = delaunay(pts)
  const shades = tris.map(([a, b, c]) => shade(pts[a], pts[b], pts[c]))
  const faces = tris.map(([a, b, c], i) => ({
    d: `M${f(pts[a].x)} ${f(pts[a].y)}L${f(pts[b].x)} ${f(pts[b].y)}L${f(pts[c].x)} ${f(pts[c].y)}Z`,
    o: Math.max(0, Math.min(1, (1 - shades[i]) * 1.7)) * FACE_MAX,
  }))

  // 摺痕：兩面共用的邊，明暗差得多就畫
  const owner = new Map<string, number>()
  const creases: { d: string; o: number }[] = []
  tris.forEach(([a, b, c], i) => {
    for (const [u, v] of [[a, b], [b, c], [c, a]] as const) {
      const k = u < v ? `${u},${v}` : `${v},${u}`
      const j = owner.get(k)
      if (j === undefined) { owner.set(k, i); continue }
      const o = Math.min(1, Math.abs(shades[i] - shades[j]) * 4) * CREASE_MAX
      if (o > 0.03) creases.push({ d: `M${f(pts[u].x)} ${f(pts[u].y)}L${f(pts[v].x)} ${f(pts[v].y)}`, o })
    }
  })

  return { faces, creases, outline: edge.map((p) => `${f(p.x)},${f(p.y)}`).join(' ') }
}

export function CrumpledPaper({ seed }: { seed: string }) {
  const { faces, creases, outline } = build(seed)
  return (
    <svg
      aria-hidden
      viewBox={`-3 -3 ${W + 6} ${H + 6}`}
      preserveAspectRatio="none"
      className="pointer-events-none absolute -top-3 -left-2 -z-10 h-[calc(100%+1.5rem)] w-[calc(100%+1rem)] text-foreground"
    >
      {/* 紙本身：一層極淡的墨，讓整張紙從底下的紙浮出一點點 */}
      <polygon points={outline} fill="currentColor" fillOpacity={0.02} />
      {faces.map((face, i) => (
        <path key={i} d={face.d} fill="currentColor" fillOpacity={face.o} />
      ))}
      {creases.map((c, i) => (
        <path key={`c${i}`} d={c.d} stroke="currentColor" strokeOpacity={c.o} strokeWidth={0.7} vectorEffect="non-scaling-stroke" fill="none" />
      ))}
    </svg>
  )
}
