import { useRouter } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { deLocalizeUrl } from '#/paraglide/runtime'
import { inkTheme } from '@/lib/ink-intro'
import { shouldInkWash } from '@/lib/ink-wash'
import { isPostTransitionActive } from '@/lib/post-transitions'

// 列表 ⇄ 列表的暈染（判斷哪些換頁要做見 lib/ink-wash.ts）。在捕獲階段攔下站內連結的點擊：
// 點擊處的墨暈開蓋滿畫面才真的換頁，新頁載好再被水洗淡。轉場中一碰螢幕、捲動、按鍵就直接跳到結果。
// 每次轉場才建立 WebGL，播完釋放、移除畫布。減少動態效果時不攔，照常換頁。
export function InkWash() {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [playing, setPlaying] = useState(false)
  const pending = useRef<{ x: number; y: number; href: string } | null>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      if (pending.current || isPostTransitionActive() || matchMedia('(prefers-reduced-motion: reduce)').matches) return
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return
      const url = new URL(a.href)
      if (url.origin !== location.origin) return
      const to = deLocalizeUrl(url)
      if (!shouldInkWash(router.state.location.pathname, to.pathname)) return
      e.preventDefault()
      e.stopPropagation()
      pending.current = { x: e.clientX, y: e.clientY, href: to.pathname + to.search + to.hash }
      setPlaying(true)
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [router])

  useEffect(() => {
    const job = pending.current
    const canvas = canvasRef.current
    if (!playing || !job || !canvas) return
    let navigated: Promise<void> | null = null
    const go = () => (navigated ??= router.navigate({ href: job.href }))
    let dispose: (() => void) | undefined
    let ended = false
    const end = () => {
      if (ended) return
      ended = true
      // 立刻藏起來，不等 React 移除畫布：中斷的那一下若點在文章連結上，展卷馬上要截圖，不能截到殘墨
      canvas.style.visibility = 'hidden'
      removeEventListener('pointerdown', end, true)
      removeEventListener('wheel', end)
      removeEventListener('keydown', end, true)
      go()
      dispose?.()
      pending.current = null
      setPlaying(false)
    }
    addEventListener('pointerdown', end, true)
    addEventListener('wheel', end, { passive: true })
    addEventListener('keydown', end, true)

    ;(async () => {
      const { createInkFluid } = await import('@/lib/ink-fluid')
      if (ended) return
      const fluid = createInkFluid(canvas)
      if (!fluid) return end()
      dispose = () => fluid.dispose()
      await fluid.spread(inkTheme(), job.x, job.y)
      if (ended) return
      await go()
      if (ended) return
      await fluid.reveal(650)
      end()
    })()
    return end
  }, [playing, router])

  return playing ? <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-[90] h-dvh w-screen" /> : null
}
