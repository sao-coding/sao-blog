'use client'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Maximize, Minus, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { m } from '#/paraglide/messages'
import { getLocale } from '#/paraglide/runtime'
import { readExif, type PhotoExif } from './exif'

// 圖片／mermaid／Excalidraw 共用的燈箱：點一下放大，可 + − 縮放、滾輪縮放（以游標為中心）、
// 拖曳平移、雙指縮放、雙擊切換 2×、Esc 關閉。
//
// 燈箱內容是「點開當下」把原本畫好的 DOM 複製一份（SVG 或 img），
// 所以各 renderer 不用為燈箱再渲染一次，mermaid fallback / Excalidraw 的非同步 SVG 也能直接用。
//
// 開關有 FLIP 動畫：打開時內容從文章裡原本的位置放大飛到中央，關閉時（含已縮放／平移的狀態）飛回原位；
// 燈箱開著時原圖設 visibility: hidden，看起來像是「把圖拿起來」。prefers-reduced-motion 時不做動畫。
//
// 相簿：帶 gallery 的 Zoomable（文章圖片）點開時，會收集同一篇文章（.mdx-wrapper）裡所有 gallery 圖片，
// 燈箱裡可以用 ← →、兩側按鈕或左右滑動切換；照片有 EXIF 時在上方顯示拍攝資訊。

const MIN = 0.5
const MAX = 8
const STEP = 1.4
const clamp = (v: number) => Math.min(MAX, Math.max(MIN, v))
const FLIP_MS = 320
const FLIP_EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)'
/** 未放大時，水平拖超過這個距離就切換到上一張／下一張 */
const SWIPE_PX = 60

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// 算出把「畫面上的內容 from」疊到「文章裡的原圖 to」上的 transform，原點是 wrapper 中心（transform-origin 預設值）。
// SVG 在燈箱裡撐滿 92vw × 84vh、以 meet 置中，實際畫到的寬度要依原圖比例扣掉留白；
// img 的比例本來就跟原圖一樣，drawnW 就是 from.width。
function transformOnto(from: DOMRect, to: DOMRect, wrapper: DOMRect) {
  const drawnW = Math.min(from.width, from.height * (to.width / to.height))
  const s = to.width / drawnW
  const wx = wrapper.left + wrapper.width / 2
  const wy = wrapper.top + wrapper.height / 2
  const fx = from.left + from.width / 2
  const fy = from.top + from.height / 2
  const tx = to.left + to.width / 2 - (wx + s * (fx - wx))
  const ty = to.top + to.height / 2 - (wy + s * (fy - wy))
  return `translate(${tx}px, ${ty}px) scale(${s})`
}

const usableRect = (r: DOMRect | null): r is DOMRect => !!r && r.width > 0 && r.height > 0

// 複製原圖給燈箱用：拿掉「開著時藏起原圖」留下的 visibility，lazy 圖片在燈箱裡要立刻載入
function snapshot(el: HTMLElement) {
  const copy = el.cloneNode(true) as HTMLElement
  copy.style.visibility = ''
  if (copy instanceof HTMLImageElement) copy.loading = 'eager'
  return copy.outerHTML
}

export function Zoomable({
  children,
  label,
  contentClassName,
  className,
  gallery,
}: {
  children: ReactNode
  /** 燈箱的無障礙名稱（圖說或 alt） */
  label?: string
  /** 燈箱內容外層的 class（例如 excalidraw-canvas，讓深色反相等樣式也套到燈箱裡） */
  contentClassName?: string
  className?: string
  /** 加入文章相簿：燈箱裡可以切換同一篇文章所有 gallery 圖片，圖說改讀各自的 alt */
  gallery?: boolean
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [items, setItems] = useState<HTMLElement[] | null>(null)
  const [index, setIndex] = useState(0)
  const source = items?.[index] ?? null
  const sourceRef = useRef<HTMLElement | null>(null)
  sourceRef.current = source

  const open = () => {
    const el = ref.current?.querySelector<HTMLElement>('svg, img')
    if (!el) return
    const root = gallery ? ref.current!.closest('.mdx-wrapper') : null
    const list = root ? [...root.querySelectorAll<HTMLElement>('.zoomable[data-gallery] img')] : [el]
    setItems(list.includes(el) ? list : [el])
    setIndex(Math.max(0, list.indexOf(el)))
  }

  const close = useCallback(() => setItems(null), [])
  const getSourceRect = useCallback(() => sourceRef.current?.getBoundingClientRect() ?? null, [])
  const count = items?.length ?? 0
  const navigate = useCallback((delta: number) => setIndex((i) => (count ? (i + delta + count) % count : i)), [count])

  const html = useMemo(() => (source ? snapshot(source) : null), [source])
  // 相簿裡每張的說明不同，讀各自 img 上的 data-lightbox-label（MdxImage 已排除檔名 alt）
  const itemLabel = gallery ? source?.dataset.lightboxLabel || undefined : label
  const imageSrc = source instanceof HTMLImageElement ? source.currentSrc || source.src : undefined

  // 燈箱開著時藏起原圖（切換到別張時換藏那一張）；關閉或元件卸載（例如換頁）時還原
  useEffect(() => {
    if (!source) return
    source.style.visibility = 'hidden'
    return () => {
      source.style.visibility = ''
    }
  }, [source])

  return (
    <>
      {/* span：markdown 圖片會出現在 <p> 裡，不能用 div／button 包 */}
      <span
        ref={ref}
        role="button"
        tabIndex={0}
        aria-label={label ? m.lightbox_open_with_label({ label }) : m.lightbox_title()}
        className={cn('zoomable block cursor-zoom-in', className)}
        data-gallery={gallery || undefined}
        onClick={open}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            open()
          }
        }}
      >
        {children}
      </span>
      {html !== null && (
        <LightboxViewer
          html={html}
          label={itemLabel}
          contentClassName={contentClassName}
          imageSrc={gallery ? imageSrc : undefined}
          index={index}
          count={count}
          onNavigate={navigate}
          getSourceRect={getSourceRect}
          onClose={close}
        />
      )}
    </>
  )
}

function LightboxViewer({
  html,
  label,
  contentClassName,
  imageSrc,
  index,
  count,
  onNavigate,
  getSourceRect,
  onClose: unmount,
}: {
  html: string
  label?: string
  contentClassName?: string
  /** 照片網址，用來讀 EXIF；mermaid／Excalidraw 不傳 */
  imageSrc?: string
  /** 相簿裡第幾張（0 起算）與總張數；count ≤ 1 時不顯示切換 UI */
  index: number
  count: number
  onNavigate: (delta: number) => void
  /** 文章裡原圖目前的位置，FLIP 動畫用；拿不到就只做淡入淡出 */
  getSourceRect: () => DOMRect | null
  onClose: () => void
}) {
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 })
  const [closing, setClosing] = useState(false)
  const [exif, setExif] = useState<PhotoExif | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const flipRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ dist: number; scale: number } | null>(null)
  const swipeStart = useRef<{ x: number; y: number } | null>(null)
  const moved = useRef(false)
  const navDir = useRef(0)
  const multi = count > 1

  // 打開：First = 原圖位置、Last = 燈箱裡的版面位置；先 Invert 疊回原圖，再 Play 到 none
  useLayoutEffect(() => {
    const src = getSourceRect()
    if (!usableRect(src) || prefersReducedMotion()) return
    const wrapper = flipRef.current!
    const from = transformOnto(contentRef.current!.getBoundingClientRect(), src, wrapper.getBoundingClientRect())
    const anim = wrapper.animate([{ transform: from }, { transform: 'none' }], { duration: FLIP_MS, easing: FLIP_EASE })
    // StrictMode 會再跑一次 effect，不先取消的話第二次會量到動畫中途的位置
    return () => anim.cancel()
  }, [getSourceRect])

  // 相簿切換：新的一張從切換方向滑進來
  useLayoutEffect(() => {
    const dir = navDir.current
    if (!dir || prefersReducedMotion()) return
    navDir.current = 0
    const anim = flipRef.current!.animate(
      [
        { transform: `translateX(${dir * 48}px)`, opacity: 0 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: 220, easing: FLIP_EASE },
    )
    return () => anim.cancel()
  }, [html])

  useEffect(() => {
    setExif(null)
    if (!imageSrc) return
    let alive = true
    readExif(imageSrc, getLocale()).then((data) => alive && setExif(data))
    return () => {
      alive = false
    }
  }, [imageSrc])

  const reset = useCallback(() => setView({ scale: 1, x: 0, y: 0 }), [])

  const go = useCallback(
    (delta: number) => {
      if (!multi) return
      navDir.current = delta
      reset()
      onNavigate(delta)
    },
    [multi, onNavigate, reset],
  )

  // 關閉：從目前看到的樣子（可能已縮放／平移）飛回原圖位置，動畫結束才真的卸載
  const onClose = useCallback(() => {
    if (closing) return
    setClosing(true)
    const src = getSourceRect()
    const wrapper = flipRef.current
    if (!usableRect(src) || !wrapper || prefersReducedMotion()) {
      unmount()
      return
    }
    for (const a of wrapper.getAnimations()) a.cancel()
    const to = transformOnto(contentRef.current!.getBoundingClientRect(), src, wrapper.getBoundingClientRect())
    wrapper
      .animate([{ transform: 'none' }, { transform: to }], {
        duration: FLIP_MS * 0.85,
        easing: FLIP_EASE,
        fill: 'forwards',
      })
      .finished.then(unmount, unmount)
    // 保險：分頁在背景時動畫時間軸會暫停，finished 遲遲不 resolve，燈箱就會卡在不能操作的狀態
    setTimeout(unmount, FLIP_MS + 300)
  }, [closing, getSourceRect, unmount])

  // 以畫面上某一點（相對舞台中心）為中心縮放，讓那一點停在原地
  const zoomAt = useCallback((next: number, cx = 0, cy = 0) => {
    setView((v) => {
      const s = clamp(next)
      const k = s / v.scale
      return { scale: s, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k }
    })
  }, [])

  const toCenter = (clientX: number, clientY: number) => {
    const r = stageRef.current!.getBoundingClientRect()
    return { cx: clientX - r.left - r.width / 2, cy: clientY - r.top - r.height / 2 }
  }

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'ArrowRight') go(1)
      else if (e.key === '+' || e.key === '=') setView((v) => ({ ...v, scale: clamp(v.scale * STEP) }))
      else if (e.key === '-') setView((v) => ({ ...v, scale: clamp(v.scale / STEP) }))
      else if (e.key === '0') reset()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose, go, reset])

  // wheel 要 passive: false 才能 preventDefault，React 的 onWheel 做不到
  useEffect(() => {
    const stage = stageRef.current!
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const { cx, cy } = toCenter(e.clientX, e.clientY)
      setView((v) => {
        const s = clamp(v.scale * Math.exp(-e.deltaY * 0.0015))
        const k = s / v.scale
        return { scale: s, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k }
      })
    }
    stage.addEventListener('wheel', onWheel, { passive: false })
    return () => stage.removeEventListener('wheel', onWheel)
  }, [])

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.lightbox-toolbar, .lightbox-nav')) return
    stageRef.current!.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    moved.current = false
    swipeStart.current = pointers.current.size === 1 ? { x: e.clientX, y: e.clientY } : null
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale: view.scale }
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId)
    if (!prev) return
    const cur = { x: e.clientX, y: e.clientY }
    pointers.current.set(e.pointerId, cur)

    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      const { cx, cy } = toCenter((a.x + b.x) / 2, (a.y + b.y) / 2)
      zoomAt(pinch.current.scale * (dist / pinch.current.dist), cx, cy)
      moved.current = true
      swipeStart.current = null
      return
    }
    const dx = cur.x - prev.x
    const dy = cur.y - prev.y
    if (Math.abs(dx) + Math.abs(dy) > 1) moved.current = true
    setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }))
  }

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    // 沒放大時的水平拖曳＝切換相簿；沒達到門檻就讓圖片彈回原位
    const start = swipeStart.current
    swipeStart.current = null
    if (!start || !multi || view.scale > 1.01) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1)
    else if (moved.current) reset()
  }

  // 點到內容以外的空白處（且不是拖曳）才關閉
  const onStageClick = (e: React.MouseEvent) => {
    if (moved.current) return
    if (!(e.target as HTMLElement).closest('.lightbox-content, .lightbox-toolbar, .lightbox-nav')) onClose()
  }

  const onDoubleClick = (e: React.MouseEvent) => {
    const { cx, cy } = toCenter(e.clientX, e.clientY)
    if (view.scale > 1.01) reset()
    else zoomAt(2, cx, cy)
  }

  const exifLine = exif ? [exif.camera, exif.lens, exif.settings.join('  '), exif.date].filter(Boolean) : []

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label ?? m.lightbox_title()}
      className="lightbox"
      data-closing={closing || undefined}
    >
      <div
        ref={stageRef}
        className={cn('lightbox-stage', view.scale > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-out')}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={onStageClick}
        onDoubleClick={onDoubleClick}
      >
        {/* 外層只負責 FLIP／切換動畫，內層 transform 是使用者的縮放／平移，分開才不會互相蓋掉 */}
        <div ref={flipRef}>
          <div
            ref={contentRef}
            className={cn('lightbox-content', contentClassName)}
            style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>

      {multi && (
        <>
          <button
            type="button"
            className="lightbox-nav"
            data-side="prev"
            aria-label={m.lightbox_prev()}
            onClick={() => go(-1)}
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            className="lightbox-nav"
            data-side="next"
            aria-label={m.lightbox_next()}
            onClick={() => go(1)}
          >
            <ChevronRight className="size-5" />
          </button>
        </>
      )}

      <div className="lightbox-toolbar">
        {multi && (
          <>
            <span className="px-2 text-xs tabular-nums opacity-70" aria-live="polite">
              {index + 1} / {count}
            </span>
            <span className="mx-1 h-4 w-px bg-current opacity-20" />
          </>
        )}
        <button type="button" aria-label={m.lightbox_zoom_out()} onClick={() => zoomAt(view.scale / STEP)}>
          <Minus className="size-4" />
        </button>
        <button type="button" aria-label={m.lightbox_reset()} className="w-14 text-xs tabular-nums" onClick={reset}>
          {Math.round(view.scale * 100)}%
        </button>
        <button type="button" aria-label={m.lightbox_zoom_in()} onClick={() => zoomAt(view.scale * STEP)}>
          <Plus className="size-4" />
        </button>
        <span className="mx-1 h-4 w-px bg-current opacity-20" />
        <button type="button" aria-label={m.lightbox_fit()} onClick={reset}>
          <Maximize className="size-4" />
        </button>
        <button type="button" aria-label={m.lightbox_close()} onClick={onClose}>
          <X className="size-4" />
        </button>
      </div>
      {(label || exifLine.length > 0) && (
        <div className="lightbox-header">
          {label && <p className="lightbox-caption">{label}</p>}
          {exifLine.length > 0 && (
            <p className="lightbox-exif">
              {exifLine.map((part) => (
                <span key={part}>{part}</span>
              ))}
            </p>
          )}
        </div>
      )}
    </div>,
    document.body,
  )
}
