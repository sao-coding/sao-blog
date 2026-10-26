import { useRouter } from '@tanstack/react-router'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { deLocalizeUrl } from '#/paraglide/runtime'
import { GardenLayer } from '@/components/garden/garden-layer'
import { dollyVoyage, requestPullOut } from '@/lib/ink-push'
import { isListPath } from '@/lib/ink-wash'
import { isPostTransitionActive } from '@/lib/post-transitions'

// 首頁 ⇄ 列表（遠 ⇄ 中）的推近／拉遠，3D 那一半見 ink-voyage.ts 與 lib/ink-push.ts。
// 推近：點下去，鏡頭順江往鳥居推進；紙色漫上來、庭的砂紋淡入（就是列表頁那張 GardenLayer），
//       這時才換頁，再撤掉紙，砂紋原地接上列表頁自己的庭。
// 拉遠：反過來——先蓋上紙與砂紋、換回首頁，紙退去，3D 建好時鏡頭從推近的位置拉回。
// （原本推近時還從江面畫一道遣水接到砂紋，看不出在做什麼，已拿掉。）
// 轉場中一碰螢幕、捲動、按鍵就直接跳到結果。減少動態效果時不攔，照常換頁。

type Job = { dir: 'in' | 'out'; href: string }

export function InkPush() {
  const router = useRouter()
  const [job, setJob] = useState<Job | null>(null)
  const busy = useRef(false)
  const paperRef = useRef<HTMLDivElement>(null)
  const gardenRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      if (busy.current || isPostTransitionActive() || matchMedia('(prefers-reduced-motion: reduce)').matches) return
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return
      const url = new URL(a.href)
      if (url.origin !== location.origin) return
      const to = deLocalizeUrl(url)
      const from = router.state.location.pathname
      const dir = from === '/' && isListPath(to.pathname) ? 'in' : isListPath(from) && to.pathname === '/' ? 'out' : null
      if (!dir) return
      e.preventDefault()
      e.stopPropagation()
      busy.current = true
      setJob({ dir, href: to.pathname + to.search + to.hash })
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [router])

  useLayoutEffect(() => {
    const paper = paperRef.current
    const garden = gardenRef.current
    if (!job || !paper || !garden) return

    let navigated: Promise<void> | null = null
    const go = () => (navigated ??= router.navigate({ href: job.href }))
    const running: Animation[] = []
    const play = (el: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
      const anim = el.animate(keyframes, { fill: 'both', ...options })
      running.push(anim)
      // 被中斷（cancel）時 finished 會 reject，當作播完；後面靠 ended 停下
      return anim.finished.then(
        () => undefined,
        () => undefined,
      )
    }
    let ended = false
    const end = () => {
      if (ended) return
      ended = true
      // 立刻藏起來，不等 React 移除：中斷的那一下若點在文章連結上，展卷馬上要截圖，不能截到這層紙
      if (paper.parentElement) paper.parentElement.style.visibility = 'hidden'
      removeEventListener('pointerdown', end, true)
      removeEventListener('wheel', end)
      removeEventListener('keydown', end, true)
      for (const anim of running) anim.cancel()
      go()
      busy.current = false
      setJob(null)
    }
    addEventListener('pointerdown', end, true)
    addEventListener('wheel', end, { passive: true })
    addEventListener('keydown', end, true)

    ;(async () => {
      if (job.dir === 'in') {
        dollyVoyage(1, 1150)
        play(garden, [{ opacity: 0 }, { opacity: 1 }], { delay: 620, duration: 480, easing: 'ease-out' })
        await play(paper, [{ opacity: 0 }, { opacity: 1 }], { delay: 560, duration: 520, easing: 'ease-in-out' })
        if (ended) return
        await go()
        if (ended) return
        await Promise.all([
          play(paper, [{ opacity: 1 }, { opacity: 0 }], { duration: 600, easing: 'ease-out' }),
          play(garden, [{ opacity: 1 }, { opacity: 0 }], { delay: 200, duration: 400, easing: 'ease-out' }),
        ])
      } else {
        requestPullOut()
        await go()
        if (ended) return
        await Promise.all([
          play(garden, [{ opacity: 1 }, { opacity: 0 }], { duration: 450, easing: 'ease-out' }),
          play(paper, [{ opacity: 1 }, { opacity: 0 }], { delay: 150, duration: 700, easing: 'ease-out' }),
        ])
      }
      end()
    })()
    return end
  }, [job, router])

  if (!job) return null
  const covered = job.dir === 'out' ? 1 : 0
  return (
    <div aria-hidden className="ink-push pointer-events-none fixed inset-0 z-[89]">
      <div ref={paperRef} className="absolute inset-0 bg-background" style={{ opacity: covered }} />
      <div ref={gardenRef} className="absolute inset-0" style={{ opacity: covered }}>
        <GardenLayer stones={false} />
      </div>
    </div>
  )
}
