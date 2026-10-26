import type { RakePattern } from '@/lib/season-spec'

// 庭的幾何（純函式、只有數字，SSR 與瀏覽器算出一樣的結果）。
// 參考龍安寺石庭：從斜上方看過去，耙紋是透視壓縮的平行線（遠密近疏），
// 石組坐在一塊苔島上，島的周圍繞幾圈很扁的橢圓水紋，平行線到了水紋就斷開。

export const VB_W = 1600
export const VB_H = 900
export const HORIZON = 430

// 苔島（與石組）的中心與水紋
// 石組放在最右下，避開列表與側欄；整組縮放 ISLAND_SCALE
export const ISLAND_SCALE = 0.72
export const ISLAND = { cx: 1420, cy: 790, rx: 250 * ISLAND_SCALE, ry: 58 * ISLAND_SCALE }
export const RING_GAP = { x: 30 * ISLAND_SCALE, y: 8.5 * ISLAND_SCALE }
export const RINGS = 4

const f = (n: number) => Math.round(n * 10) / 10

// 耙紋碰到繞島的橢圓（水紋外緣）就斷開；null 表示不斷
type Hole = { rx: number; ry: number } | null
const ISLAND_HOLE = { rx: ISLAND.rx + RING_GAP.x * (RINGS + 0.6), ry: ISLAND.ry + RING_GAP.y * (RINGS + 0.6) }
function outside(x: number, y: number, hole: Hole) {
  if (!hole) return true
  return ((x - ISLAND.cx) / hole.rx) ** 2 + ((y - ISLAND.cy) / hole.ry) ** 2 > 1
}

// 把點依序接成筆畫，落在洞裡的點斷開
function stroke(points: [number, number][], hole: Hole): string {
  let d = ''
  let pen = false
  for (const [x, y] of points) {
    if (outside(x, y, hole)) {
      d += `${pen ? 'L' : 'M'}${f(x)} ${f(y)}`
      pen = true
    } else pen = false
  }
  return d
}

const depthOf = (y: number) => Math.max(0, (y - HORIZON) / (VB_H - HORIZON)) // 0 遠 → 1 近

// 直紋／波紋：透視下的平行耙紋，越近（越下面）間距越大、波紋振幅也越大
function rows(wave: boolean, hole: Hole): string {
  const lines = 46
  let d = ''
  for (let i = 1; i <= lines; i++) {
    const t = i / lines
    const y0 = HORIZON + (VB_H + 40 - HORIZON) * t * t
    const depth = depthOf(y0)
    const amp = wave ? 2 + depth * 9 : 0
    const k = 0.012 / (0.4 + depth)
    const points: [number, number][] = []
    for (let x = -20; x <= VB_W + 20; x += 14) {
      points.push([x, y0 + Math.sin(x * k + i * 0.7) * amp + Math.sin(x * 0.0031 + i) * (0.6 + depth * 1.6)])
    }
    d += stroke(points, hole)
  }
  return d
}

// 斜紋：地面上的平行斜線，透視下收向地平線右外側的消失點。
// 越遠線越平、越擠，所以遠處的間隔放寬，和直紋一樣「遠密近疏」但不糊成一片
function diagonals(hole: Hole): string {
  const vx = 1760
  const bottom = VB_H + 40
  let d = ''
  let i = 0
  for (let a = (vx - VB_W - 20) / (bottom - HORIZON) + 0.02; a < 60; a += 0.042 + a * 0.04, i++) {
    // 這條線：x = vx - a (y - HORIZON)，裁到畫面內
    const yLo = Math.max(HORIZON + 3, HORIZON + (vx - VB_W - 20) / a)
    const yHi = Math.min(bottom, HORIZON + (vx + 20) / a)
    if (yLo >= yHi) continue
    const n = Math.max(2, Math.ceil(Math.hypot(a * (yHi - yLo), yHi - yLo) / 14))
    const points: [number, number][] = []
    for (let j = 0; j <= n; j++) {
      const y = yLo + ((yHi - yLo) * j) / n
      const x = vx - a * (y - HORIZON)
      points.push([x, y + Math.sin(x * 0.0031 + i) * (0.6 + depthOf(y) * 1.6)])
    }
    d += stroke(points, hole)
  }
  return d
}

// 同心圓、渦紋：比島外的水紋再多繞幾圈，其外才是平行紋
const EXTRA_RINGS = 7
const OUTER = { rx: ISLAND.rx + RING_GAP.x * (RINGS + EXTRA_RINGS), ry: ISLAND.ry + RING_GAP.y * (RINGS + EXTRA_RINGS) }
const OUTER_HOLE = { rx: OUTER.rx + RING_GAP.x * 0.6, ry: OUTER.ry + RING_GAP.y * 0.6 }

function ellipse(rx: number, ry: number) {
  const { cx, cy } = ISLAND
  return `M${f(cx - rx)} ${cy}A${f(rx)} ${f(ry)} 0 1 1 ${f(cx + rx)} ${cy}A${f(rx)} ${f(ry)} 0 1 1 ${f(cx - rx)} ${cy}`
}

// 同心圓：石的周圍繞一大片扁橢圓水紋，其外是直紋；沒有石組時從中心畫起
function ripples(island: boolean): string {
  let d = ''
  if (island) {
    for (let k = RINGS + 1; k <= RINGS + EXTRA_RINGS; k++) d += ellipse(ISLAND.rx + RING_GAP.x * k, ISLAND.ry + RING_GAP.y * k)
  } else {
    const n = Math.round(OUTER.rx / RING_GAP.x)
    for (let k = 1; k <= n; k++) d += ellipse((OUTER.rx * k) / n, (OUTER.ry * k) / n)
  }
  return d + rows(false, OUTER_HOLE)
}

// 渦紋：一道扁螺旋從石邊（沒有石組時從中心）往外捲，其外是波紋
function vortex(island: boolean): string {
  const r0 = island ? ISLAND.rx + RING_GAP.x * (RINGS + 1) : RING_GAP.x * 0.6
  const flat = OUTER.ry / OUTER.rx
  const end = ((OUTER.rx - r0) / RING_GAP.x) * Math.PI * 2
  const points: [number, number][] = []
  for (let th = 0; th <= end; th += 0.06) {
    const r = r0 + (RING_GAP.x * th) / (Math.PI * 2)
    points.push([ISLAND.cx - Math.cos(th) * r, ISLAND.cy - Math.sin(th) * r * flat])
  }
  return stroke(points, null) + rows(true, OUTER_HOLE)
}

// 青海波：一列列扇形，每個扇形三道同心弧，近一列蓋住遠一列的下半。
// 扇形從畫面中偏右往兩側排開，越近越大、越不扁，自然收向遠方
function seigaiha(hole: Hole): string {
  const vx = VB_W * 0.6
  const scale = (y: number) => {
    const depth = depthOf(y)
    return { r: 10 + depth * 66, flat: 0.3 + depth * 0.18 }
  }
  const ys: number[] = []
  for (let y = HORIZON + 6; y < VB_H + 60; ) {
    ys.push(y)
    const { r, flat } = scale(y)
    y += Math.max(2.4, r * flat * 0.5)
  }
  const centerOf = (row: number, j: number, r: number) => vx + (j + 0.5 * (row % 2)) * 2 * r
  // 點是否被下一列（較近）的扇形蓋住
  const hidden = (x: number, y: number, row: number) => {
    const yn = ys[row + 1]
    if (yn === undefined || y > yn) return false
    const { r, flat } = scale(yn)
    const j = Math.round((x - vx) / (2 * r) - 0.5 * ((row + 1) % 2))
    for (const jj of [j - 1, j, j + 1]) {
      const cx = centerOf(row + 1, jj, r)
      if (((x - cx) / r) ** 2 + ((y - yn) / (r * flat)) ** 2 < 1) return true
    }
    return false
  }
  let d = ''
  ys.forEach((y0, row) => {
    const { r, flat } = scale(y0)
    const shift = 0.5 * (row % 2)
    const jMin = Math.floor((-20 - vx) / (2 * r) - shift) - 1
    const jMax = Math.ceil((VB_W + 20 - vx) / (2 * r) - shift) + 1
    for (let j = jMin; j <= jMax; j++) {
      const cx = centerOf(row, j, r)
      for (const s of [1, 0.68, 0.36]) {
        const rr = r * s
        const n = Math.max(6, Math.ceil((Math.PI * rr) / 8))
        let points: [number, number][] = []
        for (let q = 0; q <= n; q++) {
          const th = Math.PI + (Math.PI * q) / n
          const x = cx + Math.cos(th) * rr
          const y = y0 + Math.sin(th) * rr * flat
          if (hidden(x, y, row)) {
            d += stroke(points, hole)
            points = []
          } else points.push([x, y])
        }
        d += stroke(points, hole)
      }
    }
  })
  return d
}

// 六種節氣耙紋，都在同一個透視構圖下（遠密近疏；往上、往左淡出由畫層的遮罩負責）
// island：石組出現時，耙紋到水紋處斷開；窄螢幕或只有砂紋的頁不畫石組，線就不斷
export function rakePaths(pattern: RakePattern, island = true): string {
  const hole = island ? ISLAND_HOLE : null
  switch (pattern) {
    case 'straight':
      return rows(false, hole)
    case 'wave':
      return rows(true, hole)
    case 'diagonal':
      return diagonals(hole)
    case 'ripple':
      return ripples(island)
    case 'vortex':
      return vortex(island)
    case 'seigaiha':
      return seigaiha(hole)
  }
}

// 繞島的水紋：由內向外
export function ringPaths(): string[] {
  return Array.from({ length: RINGS }, (_, k) => {
    const rx = ISLAND.rx + RING_GAP.x * (k + 1)
    const ry = ISLAND.ry + RING_GAP.y * (k + 1)
    const { cx, cy } = ISLAND
    return `M${cx - rx} ${cy}A${rx} ${ry} 0 1 1 ${cx + rx} ${cy}A${rx} ${ry} 0 1 1 ${cx - rx} ${cy}`
  })
}

// 苔島上的苔點：固定公式的偽亂數
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}
export const MOSS_DOTS = Array.from({ length: 140 }, (_, i) => {
  const a = hash(i) * Math.PI * 2
  const r = Math.sqrt(hash(i + 500))
  return {
    x: f(Math.cos(a) * r * 270),
    y: f(Math.sin(a) * r * 34 + 16),
    r: f(0.8 + hash(i + 900) * 1.8),
  }
})

// 飛石（朋友圈的點景）：一串扁平的踏石從畫面右下角外走進來，往左上遠處去。
// 參考飛石的照片：石面扁、橫寬大於縱深，越遠越小、間隔越密，左右交錯；
// 畫法參考雪舟畫岸邊石：淡墨面，靠近觀者的下緣一道粗而斷續的墨，上緣只輕點
export interface SteppingStone {
  d: string // 石面輪廓
  near: string // 下緣（近）的重墨
  far: string // 上緣（遠）的輕墨
  w: number // 筆粗依遠近
}

export const STEPPING_STONES: SteppingStone[] = (() => {
  const stones: SteppingStone[] = []
  let y = 935
  for (let k = 0; y > 610; k++) {
    const depth = depthOf(y)
    const w = 20 + depth * 96
    const h = w * (0.2 + depth * 0.14)
    // 沿一條往左上斜的路，左右交錯
    const x = 1370 + ((y - 600) / 300) * 170 + (k % 2 ? -1 : 1) * w * 0.32
    // 輪廓用低頻起伏，圓鈍不規則，不是多邊形
    const p1 = hash(k * 13) * 6.28
    const p2 = hash(k * 31) * 6.28
    const pts: [number, number][] = Array.from({ length: 28 }, (_, i) => {
      const a = (i / 28) * Math.PI * 2
      const r = 1 + Math.sin(2 * a + p1) * 0.1 + Math.sin(3 * a + p2) * 0.07
      return [x + Math.cos(a) * w * 0.5 * r, y + Math.sin(a) * h * 0.5 * r]
    })
    const edge = (side: 1 | -1) =>
      pts
        .filter(([, py]) => (py - y) * side > -h * 0.08)
        .sort((p, q) => p[0] - q[0])
        .map(([px, py], i) => `${i ? 'L' : 'M'}${f(px)} ${f(py)}`)
        .join('')
    stones.push({
      d: pts.map(([px, py], i) => `${i ? 'L' : 'M'}${f(px)} ${f(py)}`).join('') + 'Z',
      near: edge(1),
      far: edge(-1),
      w: f(1.1 + depth * 2.4),
    })
    y -= h * 1.15 + w * 0.12
  }
  return stones
})()
