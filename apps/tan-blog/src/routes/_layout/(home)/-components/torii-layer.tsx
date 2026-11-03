// 首頁的鳥居（水面、筆跡模式）：站在水線上（水線 = 社群連結那一行的底），開場的墨退掉之後一筆一筆畫出來。
// 減少動態效果時（其實那時首頁是素面，不會出現）直接畫好。換晝夜整個重建，朱色在建立時讀 token。
import { useEffect, useRef, type RefObject } from 'react'
import { whenIntroGone } from '@/lib/ink-intro'
import { drawToriiAt, paintTorii, toriiBox, toriiColor, type ToriiArt } from './torii'

const PAINT_MS = 2200

/** 水線：社群連結那一行的底，在 host 裡的位置 */
export function shoreline(host: HTMLElement, shore: HTMLElement) {
  return shore.getBoundingClientRect().bottom - host.getBoundingClientRect().top + 4
}

export function ToriiLayer({ shore, onPainted }: { shore: RefObject<HTMLElement | null>; onPainted: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const onPaintedRef = useRef(onPainted)
  onPaintedRef.current = onPainted

  useEffect(() => {
    const host = hostRef.current
    const shoreEl = shore.current
    if (!host || !shoreEl) return
    const cv = document.createElement('canvas')
    cv.className = 'absolute inset-0 block h-full w-full'
    host.append(cv)
    const ctx = cv.getContext('2d')!
    const ink = toriiColor()
    let art: ToriiArt | null = null
    let t = 0
    let raf = 0

    const render = () => {
      ctx.clearRect(0, 0, cv.width, cv.height)
      if (art) drawToriiAt(ctx, art, t)
    }
    const fit = () => {
      const d = Math.min(window.devicePixelRatio || 1, 2)
      cv.width = Math.max(1, Math.round(host.clientWidth * d))
      cv.height = Math.max(1, Math.round(host.clientHeight * d))
      ctx.setTransform(d, 0, 0, d, 0, 0)
      art = paintTorii(toriiBox(host.clientWidth, shoreline(host, shoreEl)), ink)
      render()
    }
    fit()
    void document.fonts.ready.then(fit)
    const ro = new ResizeObserver(fit)
    ro.observe(host)

    const cancel = whenIntroGone(() => {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
        t = 1
        render()
        onPaintedRef.current()
        return
      }
      const t0 = performance.now() + 150
      const step = (now: number) => {
        t = Math.min(1, Math.max(0, (now - t0) / PAINT_MS))
        render()
        if (t < 1) raf = requestAnimationFrame(step)
        else onPaintedRef.current()
      }
      raf = requestAnimationFrame(step)
    })

    return () => {
      cancel()
      cancelAnimationFrame(raf)
      ro.disconnect()
      host.replaceChildren()
    }
  }, [shore])

  return <div ref={hostRef} aria-hidden="true" className="pointer-events-none absolute inset-0" />
}
