'use client'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Maximize, Minus, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// 圖片／mermaid／Excalidraw 共用的燈箱：點一下放大，可 + − 縮放、滾輪縮放（以游標為中心）、
// 拖曳平移、雙指縮放、雙擊切換 2×、Esc 關閉。
//
// 燈箱內容是「點開當下」把原本畫好的 DOM 複製一份（SVG 或 img），
// 所以各 renderer 不用為燈箱再渲染一次，mermaid fallback / Excalidraw 的非同步 SVG 也能直接用。

const MIN = 0.5
const MAX = 8
const STEP = 1.4
const clamp = (v: number) => Math.min(MAX, Math.max(MIN, v))

export function Zoomable({
  children,
  label,
  contentClassName,
  className,
}: {
  children: ReactNode
  /** 燈箱的無障礙名稱（圖說或 alt） */
  label?: string
  /** 燈箱內容外層的 class（例如 excalidraw-canvas，讓深色反相等樣式也套到燈箱裡） */
  contentClassName?: string
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [html, setHtml] = useState<string | null>(null)

  const open = () => {
    const el = ref.current?.querySelector('svg, img')
    if (el) setHtml(el.outerHTML)
  }

  return (
    <>
      {/* span：markdown 圖片會出現在 <p> 裡，不能用 div／button 包 */}
      <span
        ref={ref}
        role="button"
        tabIndex={0}
        aria-label={label ? `放大檢視：${label}` : '放大檢視'}
        className={cn('zoomable block cursor-zoom-in', className)}
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
        <LightboxViewer html={html} label={label} contentClassName={contentClassName} onClose={() => setHtml(null)} />
      )}
    </>
  )
}

function LightboxViewer({
  html,
  label,
  contentClassName,
  onClose,
}: {
  html: string
  label?: string
  contentClassName?: string
  onClose: () => void
}) {
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 })
  const stageRef = useRef<HTMLDivElement>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ dist: number; scale: number } | null>(null)
  const moved = useRef(false)

  // 以畫面上某一點（相對舞台中心）為中心縮放，讓那一點停在原地
  const zoomAt = useCallback((next: number, cx = 0, cy = 0) => {
    setView((v) => {
      const s = clamp(next)
      const k = s / v.scale
      return { scale: s, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k }
    })
  }, [])

  const reset = useCallback(() => setView({ scale: 1, x: 0, y: 0 }), [])

  const toCenter = (clientX: number, clientY: number) => {
    const r = stageRef.current!.getBoundingClientRect()
    return { cx: clientX - r.left - r.width / 2, cy: clientY - r.top - r.height / 2 }
  }

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === '+' || e.key === '=') setView((v) => ({ ...v, scale: clamp(v.scale * STEP) }))
      else if (e.key === '-') setView((v) => ({ ...v, scale: clamp(v.scale / STEP) }))
      else if (e.key === '0') reset()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose, reset])

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
    if ((e.target as HTMLElement).closest('.lightbox-toolbar')) return
    stageRef.current!.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    moved.current = false
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
  }

  // 點到內容以外的空白處（且不是拖曳）才關閉
  const onStageClick = (e: React.MouseEvent) => {
    if (moved.current) return
    if (!(e.target as HTMLElement).closest('.lightbox-content, .lightbox-toolbar')) onClose()
  }

  const onDoubleClick = (e: React.MouseEvent) => {
    const { cx, cy } = toCenter(e.clientX, e.clientY)
    if (view.scale > 1.01) reset()
    else zoomAt(2, cx, cy)
  }

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={label ?? '放大檢視'} className="lightbox">
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
        <div
          className={cn('lightbox-content', contentClassName)}
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>

      <div className="lightbox-toolbar">
        <button type="button" aria-label="縮小" onClick={() => zoomAt(view.scale / STEP)}>
          <Minus className="size-4" />
        </button>
        <button type="button" aria-label="重設" className="w-14 text-xs tabular-nums" onClick={reset}>
          {Math.round(view.scale * 100)}%
        </button>
        <button type="button" aria-label="放大" onClick={() => zoomAt(view.scale * STEP)}>
          <Plus className="size-4" />
        </button>
        <span className="mx-1 h-4 w-px bg-current opacity-20" />
        <button type="button" aria-label="符合畫面" onClick={reset}>
          <Maximize className="size-4" />
        </button>
        <button type="button" aria-label="關閉" onClick={onClose}>
          <X className="size-4" />
        </button>
      </div>
      {label && <p className="lightbox-caption">{label}</p>}
    </div>,
    document.body,
  )
}
