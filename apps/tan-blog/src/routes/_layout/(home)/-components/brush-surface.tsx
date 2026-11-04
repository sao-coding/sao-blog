// 首頁的筆跡（DESIGN.md 第 5 節）：整個首頁是一張紙，游標就是筆。
// 一支筆是幾根筆毛排成一排：墨飽時筆毛疊成一道實的墨，越寫墨越少、寫得越快，筆毛一根根乾掉，露出飛白。
// 起筆墨飽、略頓，提筆收尖；越慢越粗；數位筆讀筆壓。墨剛落下時邊緣暈開一圈，大約兩秒半乾掉、退回紙色。
// 整個首頁都是紙（畫布蓋在首頁上面、不吃滑鼠，事件從首頁那一層收）：按著拖曳才寫，放開就收筆（滑鼠是左鍵）；
// 從連結、按鈕上按下去不寫，點連結照常。
// 觸控：橫著拖曳馬上寫；按住不動一下再畫，往哪個方向都行；直接直著滑是捲動
// （這一塊 touch-action: pan-y，瀏覽器拿去捲動時會 pointercancel；拿起筆之後 touchmove 擋掉捲動）。
// 鳥居畫完後（demo），在水線上自己寫一橫，示範這張紙可以寫；減少動態效果時不寫。
// 只用一張 2D 畫布；沒有墨的時候不跑動畫。離開首頁就拿掉。
import { useEffect, useRef, type RefObject } from 'react'
import { cssRgb } from '@/lib/ink-intro'
import { getPigment, getTool, PIGMENT_VAR, PIGMENTS, type Pigment } from './brush-pigment'
import { shoreline } from './torii-layer'
import { toriiBox } from './torii'
import { connectInk, type InkEvent, type Trace, type UnitPt } from './ink-live'

/** 墨乾掉要多久 */
const DRY_MS = 2600
/** 筆的粗細（px）：最慢、最快 */
const W_MAX = 16
const W_MIN = 1.6
/** 一支筆最多幾根筆毛（細的時候少一點） */
const BRISTLES = 12
/** 蘸一次墨能寫多長（px）：寫到這麼長，筆毛差不多都乾了 */
const INK_LEN = 1500
/** 觸控：按住不動這麼久，就算拿起筆（之後往哪個方向都能寫） */
const HOLD_MS = 240
/** 自己的筆：停筆這麼久之後才開始乾（簽名、寫字寫好幾筆，寫完之前不會先乾掉前面的） */
const PAUSE_MS = 1200
/** 一筆最多幾個點（伺服器同一個數） */
const MAX_PTS = 3000
/** 墨剛落下時邊緣暈開的時間 */
const WET_MS = 900

type Pt = { x: number; y: number; w: number; t: number; s: number }
type Stroke = {
  pts: Pt[]
  rgb: [number, number, number]
  seed: number
  done: boolean
  pigment: Pigment
  /** 別人的筆淡一點 */
  fade?: number
  /** 自己寫、要送出去的筆（登入了才有）：鳥居座標的點、送到第幾個 */
  sid?: string
  unit?: UnitPt[]
  sent?: number
  /** 別人的筆：一個點的時間 = base + 距起筆的毫秒 */
  base?: number
}
/** 乾痕整層的濃度：再多筆疊在一起也不會比這更黑 */
const TRACE_ALPHA = 0.4
/** 乾痕：首屏切成格（鳥居高的四分之一），一格最多留這麼長的墨，滿了舊的不畫 */
const TRACE_CELL = 0.25
const TRACE_CELL_MAX = 3

export function BrushSurface({
  onLive,
  shore,
  demo,
  signedIn,
  onInkOut,
}: {
  onLive: (live: boolean) => void
  shore: RefObject<HTMLElement | null>
  demo: boolean
  /** 登入了：寫的筆送出去給別人看、乾了留在紙上 */
  signedIn: boolean
  /** 今天的墨用完了（之後寫的只在自己畫面上） */
  onInkOut: () => void
}) {
  const signedInRef = useRef(signedIn)
  signedInRef.current = signedIn
  const onInkOutRef = useRef(onInkOut)
  onInkOutRef.current = onInkOut
  const hostRef = useRef<HTMLDivElement>(null)
  const onLiveRef = useRef(onLive)
  onLiveRef.current = onLive
  const brushRef = useRef<ReturnType<typeof start> | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const brush = start(host, shore, { signedIn: () => signedInRef.current, inkOut: () => onInkOutRef.current() })
    brushRef.current = brush
    onLiveRef.current(true)
    return () => {
      brush.stop()
      brushRef.current = null
      onLiveRef.current(false)
    }
  }, [shore])

  // 鳥居畫完：在水線上寫一橫（每次進首頁一次）
  useEffect(() => {
    const host = hostRef.current
    const shoreEl = shore.current
    if (!demo || !host || !shoreEl || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    return brushRef.current?.demo(shoreline(host, shoreEl))
  }, [demo, shore])

  // 首屏往上蓋到頁首後面（首屏的 -mt-[4.5rem]），往下蓋到首頁最底
  return <div ref={hostRef} aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-[4.5rem] bottom-0 z-10" />
}

// 平滑的雜訊（0–1）：筆毛沿著筆畫斷開的地方要是一段一段的，不是一顆一顆的
function noise(k: number, s: number) {
  const hash = (i: number) => {
    const r = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453
    return r - Math.floor(r)
  }
  const i = Math.floor(s)
  const f = s - i
  const u = f * f * (3 - 2 * f)
  return hash(i) * (1 - u) + hash(i + 1) * u
}

function start(
  host: HTMLDivElement,
  shore: RefObject<HTMLElement | null>,
  opts: { signedIn: () => boolean; inkOut: () => void }
) {
  // 下面一張是乾痕（整張用 TRACE_ALPHA 的濃度疊上去，疊再多也不會黑），上面一張是正在寫、還沒乾的墨
  const traceCv = document.createElement('canvas')
  traceCv.className = 'absolute inset-0 block h-full w-full'
  traceCv.style.opacity = String(TRACE_ALPHA)
  const cv = document.createElement('canvas')
  cv.className = 'absolute inset-0 block h-full w-full'
  host.append(traceCv, cv)
  const ctx = cv.getContext('2d')!
  const tctx = traceCv.getContext('2d')!
  // 墨乾掉是往紙色混過去，不是變透明：半透明的線段在接頭重疊會一顆一顆的。顏色從 token 算出來
  const paper = cssRgb('var(--background)')
  const colors = Object.fromEntries(PIGMENTS.map((p) => [p, cssRgb(PIGMENT_VAR[p])])) as Record<Pigment, [number, number, number]>
  const hex = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')
  const mix = (rgb: [number, number, number], k: number) => '#' + rgb.map((c, i) => hex(paper[i] + (c - paper[i]) * k)).join('')
  let w = 0
  let h = 0
  const fit = () => {
    const d = Math.min(window.devicePixelRatio || 1, 2)
    w = host.clientWidth
    h = host.clientHeight
    for (const [c, x] of [[cv, ctx], [traceCv, tctx]] as const) {
      c.width = Math.max(1, Math.round(w * d))
      c.height = Math.max(1, Math.round(h * d))
      x.setTransform(d, 0, 0, d, 0, 0)
      x.lineCap = 'round'
      x.lineJoin = 'round'
    }
    measure()
    drawTraces()
  }
  // 鳥居座標：柱腳中間是原點、鳥居高是 1（跟伺服器存的一樣）。畫面大小不同，筆跡也落在鳥居旁的同一處
  let box = { cx: 0, base: 0, h: 1 }
  const measure = () => {
    const el = shore.current
    if (!el) return
    const b = toriiBox(w, shoreline(host, el))
    box = { cx: b.cx, base: b.base, h: b.h }
  }
  const toUnit = (x: number, y: number, pw: number): [number, number, number] => [
    (x - box.cx) / box.h,
    (y - box.base) / box.h,
    pw / box.h,
  ]

  // 乾痕：今天紙上登入的人留下的筆。新的優先；一格的墨滿了，壓在那格的舊筆就不畫
  let traces: Trace[] = []
  const drawTraces = () => {
    tctx.clearRect(0, 0, w, h)
    const cells = new Map<string, number>()
    const keep: Trace[] = []
    for (let i = traces.length - 1; i >= 0; i--) {
      const t = traces[i]
      const mine = new Map<string, number>()
      for (let j = 1; j < t.points.length; j++) {
        const [ax, ay] = t.points[j - 1]
        const [bx, by] = t.points[j]
        const key = Math.floor(bx / TRACE_CELL) + ',' + Math.floor(by / TRACE_CELL)
        mine.set(key, (mine.get(key) ?? 0) + Math.hypot(bx - ax, by - ay))
      }
      let full = false
      for (const [k, v] of mine) if ((cells.get(k) ?? 0) + v > TRACE_CELL_MAX) full = true
      if (full) continue
      for (const [k, v] of mine) cells.set(k, (cells.get(k) ?? 0) + v)
      keep.push(t)
    }
    for (const t of keep.reverse()) {
      tctx.strokeStyle = mix(colors[t.pigment] ?? colors.mo, 1)
      for (let j = 1; j < t.points.length; j++) {
        const [ax, ay] = t.points[j - 1]
        const [bx, by, bw] = t.points[j]
        tctx.lineWidth = Math.max(0.6, bw * box.h)
        tctx.beginPath()
        tctx.moveTo(box.cx + ax * box.h, box.base + ay * box.h)
        tctx.lineTo(box.cx + bx * box.h, box.base + by * box.h)
        tctx.stroke()
      }
    }
  }
  const addTrace = (t: Trace) => {
    if (traces.some((x) => x.id === t.id)) return
    traces.push(t)
    // 等這一筆的墨乾了才浮出乾痕（乾之前上面那一張的墨蓋著）
    drawTraces()
  }
  fit()

  const strokes: Stroke[] = []
  let cur: Stroke | null = null
  /** 觸控還沒決定是寫還是捲：先收著不畫 */
  let pending = false
  let raf = 0

  /** 自己最後一次落筆的時間：自己的筆從停筆 PAUSE_MS 之後才開始乾 */
  let penAt = 0
  /** 一個點從什麼時候開始乾 */
  const dryFrom = (st: Stroke, t: number) => (st.fade ? t : Math.max(t, Math.min(penAt + PAUSE_MS, t + 30_000)))
  /** 墨的濃度：剛落下最飽，乾到最後幾成時間退得快 */
  const inkK = (age: number) => {
    const a = age / DRY_MS
    if (a >= 1) return 0
    if (a < 0.35) return 0.88
    const u = (a - 0.35) / 0.65
    return 0.88 * (1 - u * u * (3 - 2 * u))
  }

  const line = (ax: number, ay: number, bx: number, by: number, width: number, color: string) => {
    ctx.strokeStyle = color
    ctx.lineWidth = width
    ctx.beginPath()
    ctx.moveTo(ax, ay)
    ctx.lineTo(bx, by)
    ctx.stroke()
  }

  const drawStroke = (st: Stroke, now: number) => {
    const { pts, rgb, seed } = st
    const end = pts[pts.length - 1].s
    // 收筆收尖：只有提筆了才收，還在寫的那一頭不收
    const taper = (s: number) => (st.done ? Math.max(0.2, Math.min(1, (end - s) / 22)) : 1)
    // 起筆略頓：一團飽墨
    const p0 = pts[0]
    const f = st.fade ?? 1
    if (p0.t > now) return
    const k0 = inkK(now - dryFrom(st, p0.t)) * f
    if (k0 > 0.03 && pts.length > 1) {
      ctx.fillStyle = mix(rgb, k0)
      ctx.beginPath()
      ctx.arc(p0.x, p0.y, Math.max(1, pts[1].w * 0.62), 0, Math.PI * 2)
      ctx.fill()
    }
    // 濕邊：剛落下的墨往外暈一圈淡的
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]
      const b = pts[i]
      if (b.t > now) break
      const age = now - b.t
      if (age > WET_MS) continue
      const k = inkK(now - dryFrom(st, b.t)) * f
      const grow = age / WET_MS
      line(a.x, a.y, b.x, b.y, b.w * taper(b.s) * (1.1 + 0.4 * grow) + 2, mix(rgb, k * 0.13 * (1 - grow * 0.6)))
    }
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]
      const b = pts[i]
      // 別人的筆比收到的時間晚一點畫，還沒到的點先不畫
      if (b.t > now) break
      const k = inkK(now - dryFrom(st, b.t)) * f
      // 幾乎乾了就不畫：紙色的線蓋在別的底上會看得出來
      if (k < 0.03) continue
      const width = b.w * taper(b.s)
      // 乾的程度：墨用掉多少＋寫得多快（越細越快）
      const fast = 1 - (b.w - W_MIN) / (W_MAX - W_MIN)
      // 墨用掉的那一份最多讓筆毛乾到一半：寫再長也只是飛白多，不會整筆斷掉
      const dry = Math.min(0.75, Math.max(0, Math.min(0.4, (b.s / INK_LEN) * 0.45) + fast * 0.6 - 0.36))
      // 筆毛：一排墨點沿著筆畫蓋過去。墨飽時點疊成實的一道，邊上的點微微錯開，邊緣才是毛的；
      // 墨少了、寫快了，筆毛一段一段乾掉（雜訊沿著筆畫的長度走），邊上的先乾
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
      const nx = -(b.y - a.y) / len
      const ny = (b.x - a.x) / len
      const n = Math.min(BRISTLES, Math.max(3, Math.round(width / 1.4)))
      const r = Math.max(0.45, (width / n) * 0.78)
      const steps = Math.max(1, Math.ceil(len / Math.max(0.5, r * 0.55)))
      for (let j = 0; j < n; j++) {
        const side = j / (n - 1) - 0.5
        const o = side * width * 0.92
        const thr = dry + side * side * (0.3 + dry)
        ctx.fillStyle = mix(rgb, k * (0.74 + 0.26 * noise(j + seed + 31, b.s / 40)))
        ctx.beginPath()
        for (let q = 0; q < steps; q++) {
          const u = q / steps
          const s = a.s + (b.s - a.s) * u
          if (thr > 0 && noise(j + seed, s / 38) < thr) continue
          const jit = (noise(j + seed + 7, s / 3) - 0.5) * r * (0.6 + 2 * Math.abs(side))
          const rr = r * (0.8 + 0.35 * noise(j + seed + 13, s / 5))
          const px = a.x + (b.x - a.x) * u + nx * (o + jit)
          const py = a.y + (b.y - a.y) * u + ny * (o + jit)
          ctx.moveTo(px + rr, py)
          ctx.arc(px, py, rr, 0, Math.PI * 2)
        }
        ctx.fill()
      }
    }
  }

  const draw = (now: number) => {
    for (let i = strokes.length - 1; i >= 0; i--) {
      const st = strokes[i]
      const last = st.pts[st.pts.length - 1]
      if (st !== cur && (!last || now - dryFrom(st, last.t) > DRY_MS)) strokes.splice(i, 1)
    }
    ctx.clearRect(0, 0, w, h)
    for (const st of strokes) if (st.pts.length > 1 && !(st === cur && pending)) drawStroke(st, now)
    raf = strokes.length ? requestAnimationFrame(draw) : 0
  }
  const kick = () => {
    if (!raf) raf = requestAnimationFrame(draw)
  }

  const end = () => {
    if (cur) cur.done = true
    if (cur && pending) strokes.splice(strokes.indexOf(cur), 1)
    else if (cur) flush(cur, true)
    cur = null
    pending = false
  }

  // ── 送出自己的筆、收別人的筆 ──
  const live = connectInk({
    today: (list) => {
      traces = list
      drawTraces()
    },
    event: (e) => onEvent(e),
  })
  /** 自己送出去的 sid：伺服器轉回來的那一份不再畫一次 */
  const mySids = new Set<string>()
  /** 今天的墨用完了：之後寫的只在自己畫面上 */
  let inkOut = false
  // 一段一段照順序送（同一筆的點不會亂掉）
  let sending: Promise<unknown> = Promise.resolve()
  const flush = (st: Stroke, done: boolean) => {
    if (!st.sid || !st.unit) return
    const all = st.unit
    const pts = all.slice(st.sent ?? 0)
    if (!pts.length && !done) return
    st.sent = all.length
    const { sid, pigment } = st
    if (done) st.sid = undefined
    for (let i = 0; i < pts.length || i === 0; i += 120) {
      const part = pts.slice(i, i + 120)
      const last = done && i + 120 >= pts.length
      sending = sending.then(async () => {
        let res = await live.write({ sid, pigment, pts: part, done: last })
        // 收筆那一段沒送到就再送一次，不然整筆不會存
        if (!res && last) res = await new Promise((r) => setTimeout(r, 600)).then(() => live.write({ sid, pigment, pts: part, done: last }))
        if (!res) return
        if (!res.ok) {
          inkOut = true
          opts.inkOut()
          return
        }
        if (last && 'id' in res && res.id) addTrace({ id: res.id, pigment, points: all, mine: true })
      })
    }
  }
  const flusher = window.setInterval(() => {
    for (const st of strokes) if (st.sid && !(st === cur && pending)) flush(st, false)
  }, 100)

  // 別人的筆：收到的點晚 0.15 秒照原本的速度畫出來；存好了（saved）就變成乾痕
  const remote = new Map<string, { st: Stroke; unit: UnitPt[] }>()
  const onEvent = (e: InkEvent) => {
    if (e.type === 'chunk') {
      if (mySids.has(e.sid) || !e.pts.length) return
      let r = remote.get(e.sid)
      if (!r) {
        if (remote.size > 40) remote.delete(remote.keys().next().value!)
        const st: Stroke = {
          pts: [],
          rgb: colors[e.pigment] ?? colors.mo,
          seed: Math.floor(Math.random() * 97),
          done: false,
          pigment: e.pigment,
          fade: 0.8,
          base: performance.now() + 150 - e.pts[0][3],
        }
        strokes.push(st)
        r = { st, unit: [] }
        remote.set(e.sid, r)
      }
      for (const q of e.pts) {
        r.unit.push(q)
        const x = box.cx + q[0] * box.h
        const y = box.base + q[1] * box.h
        const last = r.st.pts[r.st.pts.length - 1]
        r.st.pts.push({ x, y, w: Math.max(1, q[2] * box.h), t: r.st.base! + q[3], s: last ? last.s + Math.hypot(x - last.x, y - last.y) : 0 })
      }
      if (e.done) r.st.done = true
      kick()
    } else if (e.type === 'saved') {
      const r = remote.get(e.sid)
      if (!r) return
      remote.delete(e.sid)
      addTrace({ id: e.id, pigment: r.st.pigment, points: r.unit })
    } else if (e.type === 'erase') {
      traces = e.ids === 'all' ? [] : traces.filter((t) => !(e.ids as string[]).includes(t.id))
      drawTraces()
    }
  }

  const begin = (x: number, y: number, t: number, w0: number, pigment: Pigment) => {
    const st: Stroke = { pts: [{ x, y, w: w0, t, s: 0 }], rgb: colors[pigment], seed: Math.floor(Math.random() * 97), done: false, pigment }
    strokes.push(st)
    if (strokes.length > 60) strokes.splice(0, strokes.length - 60)
    return st
  }

  const push = (st: Stroke | null, x: number, y: number, t: number, pressure: number | null) => {
    if (!st) return
    const last = st.pts[st.pts.length - 1]
    const dist = Math.hypot(x - last.x, y - last.y)
    if (dist < 1.2) return
    if (!st.fade) penAt = t
    const speed = dist / Math.max(1, t - last.t)
    let target = W_MIN + (W_MAX - W_MIN) * Math.exp(-speed * 0.9)
    if (pressure !== null) target *= 0.35 + 1.1 * pressure
    // 粗細慢慢跟上，筆畫才不會一節一節的
    const pw = last.w * 0.65 + target * 0.35
    st.pts.push({ x, y, w: pw, t, s: last.s + dist })
    if (st.unit) {
      const [ux, uy, uw] = toUnit(x, y, pw)
      st.unit.push([ux, uy, uw, Math.round(t - st.pts[0].t)])
    }
    if (st.pts.length >= MAX_PTS) {
      st.done = true
      if (st === cur) end()
    }
    kick()
  }

  // 事件從首頁那一層收（畫布不吃滑鼠，底下的連結才點得到）
  const area = host.parentElement ?? host
  /** 從連結、按鈕、輸入框上按下去：照常點，不寫 */
  const interactive = (e: PointerEvent) =>
    e.target instanceof Element && !!e.target.closest('a, button, input, textarea, select, label, summary, [role="button"], [role="radio"], [contenteditable]')

  const local = (e: PointerEvent) => {
    const r = host.getBoundingClientRect()
    return [e.clientX - r.left, e.clientY - r.top] as const
  }

  const onMove = (e: PointerEvent) => {
    if (erasing && (e.buttons & 1) !== 0) {
      const [x, y] = local(e)
      eraseAt(x, y)
      return
    }
    // 按著才寫（滑鼠是左鍵）
    if (!cur || (e.buttons & 1) === 0) return
    const touch = e.pointerType === 'touch'
    // 觸控還沒決定：橫著拖曳就是寫；直著滑是捲動（瀏覽器會 pointercancel），這一筆丟掉
    if (touch && pending) {
      const p0 = cur.pts[0]
      const [x, y] = local(e)
      if (Math.hypot(x - p0.x, y - p0.y) <= 10) return
      if (Math.abs(x - p0.x) < Math.abs(y - p0.y)) {
        end()
        return
      }
      pending = false
      clearTimeout(hold)
    }
    const events = e.getCoalescedEvents?.() ?? []
    for (const ev of events.length ? events : [e]) {
      const [x, y] = local(ev)
      if (x < 0 || y < 0 || x > w || y > h) {
        end()
        return
      }
      push(cur, x, y, ev.timeStamp || performance.now(), ev.pointerType === 'pen' ? ev.pressure : null)
    }
  }
  // ── 橡皮擦：按著拖過去，碰到的自己的乾痕（還有自己還沒乾的筆）就拿掉；放開時一起告訴伺服器 ──
  let erasing: { ids: Set<string>; touch: boolean } | null = null
  const ERASE_R = 14
  const eraseAt = (x: number, y: number) => {
    if (!erasing) return
    let hit = false
    traces = traces.filter((t) => {
      if (!t.mine) return true
      const near = t.points.some((q) => Math.hypot(box.cx + q[0] * box.h - x, box.base + q[1] * box.h - y) < ERASE_R + q[2] * box.h)
      if (near) erasing!.ids.add(t.id)
      hit ||= near
      return !near
    })
    if (hit) drawTraces()
    for (let i = strokes.length - 1; i >= 0; i--) {
      const st = strokes[i]
      if (st.fade || st === cur) continue
      if (st.pts.some((q) => Math.hypot(q.x - x, q.y - y) < ERASE_R + q.w)) strokes.splice(i, 1)
    }
  }
  const stopErasing = () => {
    if (!erasing) return
    const ids = [...erasing.ids]
    erasing = null
    if (ids.length) void live.eraseMine(ids)
  }

  const onDown = (e: PointerEvent) => {
    end()
    stopErasing()
    if (e.button !== 0 || interactive(e)) return
    const [x, y] = local(e)
    // 滑鼠按著拖曳是寫字，不是選字
    if (e.pointerType === 'mouse') e.preventDefault()
    if (getTool() === 'eraser') {
      erasing = { ids: new Set(), touch: e.pointerType === 'touch' }
      if (e.pointerType !== 'touch') area.setPointerCapture(e.pointerId)
      eraseAt(x, y)
      return
    }
    cur = begin(x, y, e.timeStamp || performance.now(), 2.4, getPigment())
    // 登入了而且今天還有墨：這一筆送出去
    if (opts.signedIn() && !inkOut) {
      cur.sid = Math.random().toString(36).slice(2, 12) + Date.now().toString(36)
      mySids.add(cur.sid)
      const [ux, uy, uw] = toUnit(x, y, 2.4)
      cur.unit = [[ux, uy, uw, 0]]
      cur.sent = 0
    }
    if (e.pointerType === 'touch') {
      // 觸控：按住不動一下（HOLD_MS）也算拿起筆，之後往哪個方向都能寫（touchmove 擋掉捲動）
      pending = true
      hold = window.setTimeout(() => {
        if (cur && pending) {
          pending = false
          kick()
        }
      }, HOLD_MS)
    } else {
      area.setPointerCapture(e.pointerId)
      kick()
    }
  }
  let hold = 0
  // 已經拿起筆（不在等決定）時，手指往上下寫也不捲動
  const onTouchMove = (e: TouchEvent) => {
    if (((cur && !pending) || erasing) && e.cancelable) e.preventDefault()
  }
  const lift = () => {
    clearTimeout(hold)
    stopErasing()
    end()
  }
  area.addEventListener('pointermove', onMove)
  area.addEventListener('pointerdown', onDown)
  area.addEventListener('pointerup', lift)
  area.addEventListener('pointercancel', lift)
  area.addEventListener('touchmove', onTouchMove, { passive: false })

  const ro = new ResizeObserver(() => {
    if (host.clientWidth !== w || host.clientHeight !== h) fit()
  })
  ro.observe(host)

  /** 示範的一橫：從鳥居左腳外面寫到右腳外面，起筆慢、中段快、收筆慢 */
  const demo = (waterline: number) => {
    const box = toriiBox(w, waterline)
    const y0 = waterline + 14
    const x0 = Math.max(16, box.cx - box.w * 0.95)
    const x1 = Math.min(w - 16, box.cx + box.w * 0.8)
    const DUR = 1100
    let t0 = 0
    let id = 0
    let st: Stroke | null = null
    const step = (now: number) => {
      if (!st) {
        t0 = now
        st = begin(x0, y0, now, 2.4, 'mo')
      }
      const u = Math.min(1, (now - t0) / DUR)
      // 慢—快—慢：位置用緩進緩出
      const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2
      push(st, x0 + (x1 - x0) * e, y0 - Math.sin(e * Math.PI) * 5 + e * 3, now, null)
      if (u < 1) id = requestAnimationFrame(step)
      else st.done = true
    }
    // 等鳥居最後一筆停一下再寫；讀者已經在寫就不示範了
    const wait = setTimeout(() => {
      if (!cur) id = requestAnimationFrame(step)
    }, 400)
    return () => {
      clearTimeout(wait)
      cancelAnimationFrame(id)
    }
  }

  return {
    demo,
    stop() {
      cancelAnimationFrame(raf)
      clearInterval(flusher)
      live.stop()
      ro.disconnect()
      area.removeEventListener('pointermove', onMove)
      area.removeEventListener('pointerdown', onDown)
      area.removeEventListener('pointerup', lift)
      area.removeEventListener('pointercancel', lift)
      area.removeEventListener('touchmove', onTouchMove)
      clearTimeout(hold)
      host.replaceChildren()
    },
  }
}
