// 首頁的水面（DESIGN.md 第 5 節，階段 14）。
// 兩張畫布疊在首頁題字那一塊的後面：
// - 底下一張 2D：鳥居與社群連結在水裡的倒影（一條一條橫向錯開地晃，點下去的漣漪經過時晃得更大）、
//   從水線（社群連結那一行的底）往下幾道很淡、慢慢起伏的水紋，以及點下去的兩圈扁漣漪
// - 上面一張是開場同一支 lib/ink-fluid.ts 的一池水（pool）——點一下滴一滴墨（drop），游標滑過攪動墨流（stir）
// 開場的墨退掉後，在開場落墨的同一處再落一滴，接上開場；鳥居畫完，倒影才慢慢浮出來。
// - 載入完、主執行緒空下來才建立（afterLoadIdle），不跟首屏搶 CPU
// - 分頁不可見或捲出畫面就暫停；沒人碰、墨淡掉之後流體也停下來，下次點或滑過再接著算
// - 離開首頁釋放。dispose 之後 WebGL context 就失效，同一張畫布不能再用：每次建立都換新的畫布
// 建立 WebGL2 失敗就改成素面（markNoWater）。
import { useEffect, useRef, type RefObject } from 'react'
import { afterLoadIdle } from '@/lib/after-load'
import { afterIntro, cssRgb, inkTheme } from '@/lib/ink-intro'
import { markNoWater } from '@/lib/home-mode'
import type { InkFluid, InkTheme } from '@/lib/ink-fluid'
import { paintTorii, toriiBox, toriiColor } from './torii'
import { shoreline } from './torii-layer'

/** 墨散掉的快慢：幾秒內淡掉 */
const FADE = 0.55
/** 沒人碰之後多久讓流體停下來（墨已經淡到看不見） */
const SLEEP_MS = 9000
/** 點一下的那滴、接開場的那滴 */
const TAP_SIZE = 2.6
const HANDOFF_SIZE = 3.4
/** 開場三滴墨的第一滴落在視窗的哪裡（lib/ink-fluid.ts 的 intro，y 由上往下量） */
const INTRO_AT = [0.5, 0.44] as const
/** 水紋：幾道、到畫布多低（從水線開始；找不到水線就從 46% 開始） */
const LINES = 9
const LINES_FROM = 0.46
const LINES_TO = 0.94
const RING_MS = 1600
/** 倒影：濃度（鳥居、社群連結的圖示）、跟水線之間的縫、浮出來要多久 */
const REFLECT_ALPHA = 0.26
const LINK_ALPHA = 0.22
const REFLECT_GAP = 6
const REFLECT_IN_MS = 1400

/** 水面的墨：沒有墨面蓋著，只有墨流的邊緣顯色，所以邊緣比開場濃；不混節氣色，夜裡用淡墨（前景混三成紙色） */
function waterInk(): InkTheme {
  const t = inkTheme()
  const fg = cssRgb('var(--foreground)')
  return document.documentElement.classList.contains('dark')
    ? { ...t, edge: fg.map((c, i) => c * 0.7 + t.base[i] * 0.3) as InkTheme['edge'], edgeK: 1.8, edgeMax: 0.6, accentMix: 0 }
    : { ...t, edge: fg, edgeK: 2.4, edgeMax: 0.78, accentMix: 0 }
}

export function WaterSurface({
  onLive,
  shore,
  reflect,
}: {
  onLive: (live: boolean) => void
  /** 社群連結那一行：它的底就是水線，連結的字倒映在水裡 */
  shore: RefObject<HTMLElement | null>
  /** 鳥居畫完了，倒影可以浮出來 */
  reflect: boolean
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const onLiveRef = useRef(onLive)
  onLiveRef.current = onLive
  const reflectRef = useRef(reflect)
  reflectRef.current = reflect

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let stop: (() => void) | undefined
    let cancelled = false
    const cancelIdle = afterLoadIdle(() => {
      void import('@/lib/ink-fluid').then(({ createInkFluid }) => {
        if (cancelled) return
        stop = start(host, createInkFluid, shore, () => reflectRef.current)
        onLiveRef.current(!!stop)
      })
    })
    return () => {
      cancelled = true
      cancelIdle()
      stop?.()
      onLiveRef.current(false)
    }
  }, [shore])

  return <div ref={hostRef} aria-hidden="true" className="absolute inset-0 touch-pan-y text-ink-1" />
}

/** 筆跡模式的倒影：只有鳥居和社群連結在水裡慢慢晃（沒有墨池、水紋、漣漪），不擋筆 */
export function WaterReflection({ shore, reflect }: { shore: RefObject<HTMLElement | null>; reflect: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const reflectRef = useRef(reflect)
  reflectRef.current = reflect

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const cv = document.createElement('canvas')
    cv.className = 'absolute inset-0 block h-full w-full'
    host.append(cv)
    const ctx = cv.getContext('2d')!
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches
    let w = 0
    let h = 0
    let refls: Reflection[] = []
    let fits = 0
    const fit = () => {
      const d = Math.min(window.devicePixelRatio || 1, 2)
      w = host.clientWidth
      h = host.clientHeight
      cv.width = Math.max(1, Math.round(w * d))
      cv.height = Math.max(1, Math.round(h * d))
      ctx.setTransform(d, 0, 0, d, 0, 0)
      refls = []
      const gen = ++fits
      const shoreEl = shore.current
      if (!shoreEl) return
      const water = shoreline(host, shoreEl)
      refls.push(toriiReflection(toriiBox(w, water), water, toriiColor()))
      const bottom = shoreEl.getBoundingClientRect().bottom
      for (const svg of shoreEl.querySelectorAll<SVGSVGElement>('a svg')) {
        const r = svg.getBoundingClientRect()
        if (r.bottom < bottom - r.height / 2) continue
        void iconReflection(host, svg).then((refl) => {
          if (refl && gen === fits) refls.push(refl)
        })
      }
    }
    fit()
    void document.fonts.ready.then(() => w && fit())

    let raf = 0
    let lastDraw = 0
    let reflIn = 0
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw)
      if (now - lastDraw < 33) return
      const dt = lastDraw ? now - lastDraw : 0
      lastDraw = now
      ctx.clearRect(0, 0, w, h)
      if (refls.length && reflectRef.current) reflIn = Math.min(1, reflIn + dt / REFLECT_IN_MS)
      for (const { img, x, y, w: rw, h: rh, d, alpha } of reflIn > 0 ? refls : []) {
        for (let sy = 0; sy < rh; sy += 2) {
          const k = sy / rh
          const dx = still ? 0 : Math.sin(sy * 0.12 - now * 0.0021) * (0.6 + k * 3.2)
          ctx.globalAlpha = alpha * reflIn * Math.pow(1 - k, 1.6)
          ctx.drawImage(img, 0, sy * d, img.width, 2 * d, x + dx, y + sy, rw, 2)
        }
      }
      ctx.globalAlpha = 1
    }

    let visible = !document.hidden
    let onScreen = true
    let running = false
    const update = () => {
      const should = visible && onScreen
      if (should === running) return
      running = should
      if (should) {
        lastDraw = 0
        raf = requestAnimationFrame(draw)
      } else cancelAnimationFrame(raf)
    }
    const onVisibility = () => {
      visible = !document.hidden
      update()
    }
    document.addEventListener('visibilitychange', onVisibility)
    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting
      update()
    })
    io.observe(host)
    update()
    const ro = new ResizeObserver(() => {
      if (host.clientWidth !== w || host.clientHeight !== h) fit()
    })
    ro.observe(host)

    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      host.replaceChildren()
    }
  }, [shore])

  return <div ref={hostRef} aria-hidden="true" className="pointer-events-none absolute inset-0" />
}

type Reflection = { img: HTMLCanvasElement; x: number; y: number; w: number; h: number; d: number; alpha: number }

/** 把一個圖示（svg）照它在畫面上的大小、顏色畫進一張上下翻過來的小畫布；y 是圖示腳下。svg 要先轉成圖片，所以是非同步的 */
function iconReflection(host: HTMLElement, svg: SVGSVGElement): Promise<Reflection | null> {
  const hr = host.getBoundingClientRect()
  const r = svg.getBoundingClientRect()
  if (!r.width || !r.height) return Promise.resolve(null)
  const d = Math.min(window.devicePixelRatio || 1, 2)
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', String(r.width))
  clone.setAttribute('height', String(r.height))
  // 圖示用 currentColor：轉成圖片後讀不到頁面的顏色，直接寫進去
  clone.style.color = getComputedStyle(svg).color
  const src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone))
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => {
      const img = document.createElement('canvas')
      img.width = Math.round(r.width * d)
      img.height = Math.round(r.height * d)
      const o = img.getContext('2d')!
      o.setTransform(d, 0, 0, -d, 0, img.height)
      o.drawImage(image, 0, 0, r.width, r.height)
      resolve({ img, x: r.left - hr.left, y: r.bottom - hr.top + REFLECT_GAP, w: r.width, h: r.height, d, alpha: LINK_ALPHA })
    }
    image.onerror = () => resolve(null)
    image.src = src
  })
}

/** 鳥居的倒影：同一份畫（固定種子）上下翻過來，柱腳對齊水線 */
function toriiReflection(box: ReturnType<typeof toriiBox>, water: number, ink: string): Reflection {
  const art = paintTorii(box, ink)
  const img = document.createElement('canvas')
  img.width = art.full.width
  img.height = art.full.height
  const o = img.getContext('2d')!
  o.setTransform(1, 0, 0, -1, 0, img.height)
  o.drawImage(art.full, 0, 0)
  // 原圖柱腳下面留了一點空，翻過來後在最上面：往上挪回去對齊水線
  const pad = art.y + art.h - water
  return { img, x: art.x, y: water - pad, w: art.w, h: art.h, d: art.d, alpha: REFLECT_ALPHA }
}

function start(
  host: HTMLDivElement,
  createInkFluid: (c: HTMLCanvasElement) => InkFluid | undefined,
  shore: RefObject<HTMLElement | null>,
  canReflect: () => boolean
) {
  const lines = document.createElement('canvas')
  const gl = document.createElement('canvas')
  for (const c of [lines, gl]) c.className = 'absolute inset-0 block h-full w-full'
  host.append(lines, gl)
  const fluid = createInkFluid(gl)
  if (!fluid) {
    host.replaceChildren()
    markNoWater()
    return undefined
  }
  fluid.pool(waterInk(), FADE)

  const ctx = lines.getContext('2d')!
  // 墨色直接用 token 算出來的顏色（host 掛著 text-ink-1），透明度另外用 globalAlpha
  const ink = getComputedStyle(host).color
  const dark = document.documentElement.classList.contains('dark')
  // 晝的墨線在紙上很顯眼，壓低才不像橫線紙；夜裡淺色的線本來就淡
  const lineAlpha = dark ? 0.8 : 0.6
  let w = 0
  let h = 0
  let fadeEdges: CanvasGradient | null = null
  let refls: Reflection[] = []
  /** 第幾次排版：圖示的倒影是非同步做的，排版換了就丟掉舊的 */
  let fits = 0
  let linesFrom = LINES_FROM
  const fit = () => {
    const d = Math.min(window.devicePixelRatio || 1, 2)
    w = host.clientWidth
    h = host.clientHeight
    lines.width = Math.max(1, Math.round(w * d))
    lines.height = Math.max(1, Math.round(h * d))
    ctx.setTransform(d, 0, 0, d, 0, 0)
    // 水紋兩端淡出，不要像橫線紙
    fadeEdges = ctx.createLinearGradient(0, 0, w, 0)
    fadeEdges.addColorStop(0, 'transparent')
    fadeEdges.addColorStop(0.18, ink)
    fadeEdges.addColorStop(0.82, ink)
    fadeEdges.addColorStop(1, 'transparent')
    refls = []
    const gen = ++fits
    const shoreEl = shore.current
    if (shoreEl) {
      const water = shoreline(host, shoreEl)
      refls.push(toriiReflection(toriiBox(w, water), water, toriiColor()))
      // 只有最後一行（碰到水線的）圖示有倒影
      const bottom = shoreEl.getBoundingClientRect().bottom
      for (const svg of shoreEl.querySelectorAll<SVGSVGElement>('a svg')) {
        const r = svg.getBoundingClientRect()
        if (r.bottom < bottom - r.height / 2) continue
        void iconReflection(host, svg).then((refl) => {
          if (refl && gen === fits) refls.push(refl)
        })
      }
      linesFrom = Math.min(0.8, water / h)
    } else linesFrom = LINES_FROM
  }
  fit()
  // 字型載完、位置可能跟著變，重算一次倒影
  void document.fonts.ready.then(() => w && fit())

  const rings: { x: number; y: number; born: number }[] = []
  let raf = 0
  let lastDraw = 0
  let reflIn = 0
  const draw = (now: number) => {
    raf = requestAnimationFrame(draw)
    // 水紋與倒影很慢，30fps 就夠；有漣漪時才每幀畫
    if (!rings.length && now - lastDraw < 33) return
    const dt = lastDraw ? now - lastDraw : 0
    lastDraw = now
    ctx.clearRect(0, 0, w, h)

    if (refls.length && canReflect()) reflIn = Math.min(1, reflIn + dt / REFLECT_IN_MS)
    for (const refl of reflIn > 0 ? refls : []) {
      const { img, x, y, w: rw, h: rh, d, alpha } = refl
      for (let sy = 0; sy < rh; sy += 2) {
        const k = sy / rh
        // 越往下越晃、越淡
        let dx = Math.sin(sy * 0.12 - now * 0.0021) * (0.6 + k * 3.2)
        for (const ring of rings) {
          const age = (now - ring.born) / RING_MS
          if (age >= 1 || ring.x < x - 140 || ring.x > x + rw + 140) continue
          // 漣漪是扁的：垂直方向的半徑只有水平的三成
          const front = (10 + (1 - (1 - age) * (1 - age)) * 130) * 0.3
          const off = Math.abs(y + sy - ring.y) - front
          dx += Math.sin(off * 0.3) * 7 * (1 - age) * Math.exp(-Math.abs(off) / 16)
        }
        ctx.globalAlpha = alpha * reflIn * Math.pow(1 - k, 1.6)
        ctx.drawImage(img, 0, sy * d, img.width, 2 * d, x + dx, y + sy, rw, 2)
      }
    }

    ctx.lineWidth = 1
    ctx.strokeStyle = fadeEdges!
    for (let i = 0; i < LINES; i++) {
      const k = i / (LINES - 1)
      // 越下面越密、越濃，像水面往遠處去
      const y = h * (linesFrom + (LINES_TO - linesFrom) * (1 - (1 - k) * (1 - k * 0.35)))
      ctx.globalAlpha = (0.04 + k * 0.05) * lineAlpha
      ctx.beginPath()
      for (let x = 0; x <= w; x += 12) {
        const yy = y + Math.sin(x * 0.011 + now * 0.00035 + i * 1.7) * (1 + k * 1.6)
        if (x) ctx.lineTo(x, yy)
        else ctx.moveTo(x, yy)
      }
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    ctx.strokeStyle = ink
    for (let i = rings.length - 1; i >= 0; i--) {
      const age = (now - rings[i].born) / RING_MS
      if (age >= 1) {
        rings.splice(i, 1)
        continue
      }
      for (let k = 0; k < 2; k++) {
        const a = Math.max(0, age - k * 0.18)
        if (a <= 0) continue
        const r = 10 + (1 - (1 - a) * (1 - a)) * 130
        ctx.globalAlpha = 0.3 * (1 - a) * lineAlpha
        ctx.beginPath()
        ctx.ellipse(rings[i].x, rings[i].y, r, r * 0.3, 0, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
    ctx.globalAlpha = 1
  }

  // 沒人碰、墨淡掉之後讓流體停下來；點或滑過再叫醒
  let sleepTimer = 0
  const wake = () => {
    if (!running) return
    fluid.resume()
    window.clearTimeout(sleepTimer)
    sleepTimer = window.setTimeout(() => fluid.pause(), SLEEP_MS)
  }
  const local = (e: PointerEvent) => {
    const r = host.getBoundingClientRect()
    return [e.clientX - r.left, e.clientY - r.top] as const
  }
  const dropAt = (x: number, y: number, size: number) => {
    wake()
    fluid.drop(x, y, size)
    rings.push({ x, y, born: performance.now() })
  }
  const onDown = (e: PointerEvent) => {
    if (e.button !== 0) return
    const [x, y] = local(e)
    dropAt(x, y, TAP_SIZE)
  }
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    wake()
    const [x, y] = local(e)
    fluid.stir(x, y, e.movementX * 0.5, e.movementY * 0.5)
  }
  host.addEventListener('pointerdown', onDown)
  host.addEventListener('pointermove', onMove)

  // 分頁不可見、捲出畫面：兩張畫布都停
  let visible = !document.hidden
  let onScreen = true
  let running = false
  const update = () => {
    const should = visible && onScreen
    if (should === running) return
    running = should
    if (should) {
      lastDraw = 0
      raf = requestAnimationFrame(draw)
      wake()
    } else {
      cancelAnimationFrame(raf)
      window.clearTimeout(sleepTimer)
      fluid.pause()
    }
  }
  const onVisibility = () => {
    visible = !document.hidden
    update()
  }
  document.addEventListener('visibilitychange', onVisibility)
  const io = new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting
    update()
  })
  io.observe(host)
  update()

  const ro = new ResizeObserver(() => {
    if (host.clientWidth !== w || host.clientHeight !== h) fit()
  })
  ro.observe(host)

  // 開場的墨退掉之後，在它落墨的同一處再落一滴
  const cancelHandoff = afterIntro(() => {
    const r = host.getBoundingClientRect()
    dropAt(window.innerWidth * INTRO_AT[0] - r.left, window.innerHeight * INTRO_AT[1] - r.top, HANDOFF_SIZE)
  })

  return () => {
    cancelHandoff()
    cancelAnimationFrame(raf)
    window.clearTimeout(sleepTimer)
    io.disconnect()
    ro.disconnect()
    document.removeEventListener('visibilitychange', onVisibility)
    host.removeEventListener('pointerdown', onDown)
    host.removeEventListener('pointermove', onMove)
    fluid.dispose()
    host.replaceChildren()
  }
}
