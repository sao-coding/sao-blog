import { useEffect, useRef, useState } from 'react'
import { inkTheme } from '@/lib/ink-intro'
import { cn } from '@/lib/utils'

// 進站開場（流程見 lib/ink-intro.ts）。底下那層 .ink-intro-veil 由 CSS 依 <html data-ink-intro> 顯示，
// 這裡載入流體引擎接手後撤掉它；引擎建立失敗（不支援 WebGL2 等）就直接讓那層淡出。
// 開場中滑鼠滑過可以攪動墨流。播完釋放 WebGL。
export function InkIntro({ term }: { term: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // done：開場結束（或這次不播）就把畫布整個移掉。WebGL 釋放前最後一幀不一定來得及清掉，
  // 留著的話換頁時 View Transition 重新截圖，會把那張殘留的整面墨蓋在頁面上
  const [stage, setStage] = useState<'waiting' | 'playing' | 'leaving' | 'done'>('waiting')

  useEffect(() => {
    const root = document.documentElement
    const canvas = canvasRef.current
    if (!canvas || !('inkIntro' in root.dataset)) {
      setStage('done')
      return
    }
    let cancelled = false
    let dispose: (() => void) | undefined
    const endVeil = () => delete root.dataset.inkIntro

    ;(async () => {
      const { createInkFluid } = await import('@/lib/ink-fluid')
      // 被取消（StrictMode 的第一次 effect）就交給下一次 effect 播，蓋住的那層保留
      if (cancelled) return
      const fluid = createInkFluid(canvas)
      if (!fluid) {
        endVeil()
        setStage('done')
        return
      }
      const onMove = (e: PointerEvent) => fluid.stir(e.clientX, e.clientY, e.movementX, e.movementY)
      window.addEventListener('pointermove', onMove, { passive: true })
      dispose = () => {
        window.removeEventListener('pointermove', onMove)
        fluid.dispose()
      }
      setStage('playing')
      const intro = fluid.intro(inkTheme())
      endVeil() // 引擎已畫出同色的整面墨，CSS 那層可以撤了
      await intro
      await new Promise((r) => window.setTimeout(r, 500))
      if (cancelled) return
      setStage('leaving')
      await fluid.reveal()
      setStage('done')
      dispose()
      dispose = undefined
    })()

    return () => {
      cancelled = true
      if (!dispose) return
      endVeil()
      dispose()
    }
  }, [])

  return (
    <>
      <div aria-hidden className="ink-intro-veil">
        <span className="ink-loading-term font-wenkai">{term}</span>
      </div>
      {stage !== 'done' && (
        <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-[90] h-dvh w-screen" />
      )}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none fixed inset-0 z-[91] flex items-center justify-center transition-opacity duration-700',
          stage === 'playing' ? 'opacity-100' : 'opacity-0',
        )}
      >
        <span className="ink-loading-term font-wenkai">{term}</span>
      </div>
    </>
  )
}
