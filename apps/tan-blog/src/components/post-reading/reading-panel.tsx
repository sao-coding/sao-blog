import { useEffect, useState, type RefObject } from 'react'
import { useScroll } from 'motion/react'
import { m } from '#/paraglide/messages'
import { cn } from '@/lib/utils'
import { ReaderSeals, StampButton } from './stamp'
import { useStamps } from './use-stamps'

/** 讀到哪裡（0–1）：文章本體從頂端捲到底端 */
export function useReadProgress(target: RefObject<HTMLElement | null>) {
  const { scrollYProgress } = useScroll({ target, offset: ['start start', 'end end'] })
  const [p, setP] = useState(0)
  useEffect(() => scrollYProgress.on('change', (v) => setP(Math.min(1, Math.max(0, v)))), [scrollYProgress])
  return p
}

/** 一條細墨線：讀過的部分是濃墨，沒讀的是髮絲線 */
export function ProgressLine({ progress, className }: { progress: number; className?: string }) {
  return (
    <div className={cn('relative h-px bg-ink-5', className)} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
      <div className="absolute inset-y-0 left-0 origin-left bg-ink-2" style={{ width: '100%', scale: `${progress} 1` }} />
    </div>
  )
}

/**
 * 桌機頁邊下方的閱讀區塊（2026-11-02）：目錄底下、離畫面下緣一段高度，捲動時跟著停在那裡。
 * 閱讀時間與進度、蓋印、蓋過印的讀者、寫留言（開 CommentDialog）。
 */
export function ReadingPanel({
  postId,
  readingTime,
  progress,
  onComment,
}: {
  postId: string
  readingTime: number
  progress: number
  onComment: () => void
}) {
  const { state, me, toggle } = useStamps(postId)
  return (
    <div className="flex flex-col gap-4 pl-3 font-display text-[13px] text-ink-3">
      <div>
        <p className="mb-2 flex justify-between tabular-nums">
          <span>{m.reading_minutes({ count: String(Math.max(1, Math.round(readingTime))) })}</span>
          <span>{Math.round(progress * 100)}%</span>
        </p>
        <ProgressLine progress={progress} />
      </div>
      {state && (
        <div className="flex items-start gap-3">
          <StampButton state={state} me={me} onToggle={toggle} />
          <div className="min-w-0 pt-0.5">
            <p className="tabular-nums">{m.stamp_count({ count: String(state.likes) })}</p>
            <ReaderSeals readers={state.readers.filter((r) => r.id !== me?.id || !state.liked)} size={20} className="mt-1.5" />
          </div>
        </div>
      )}
      <button type="button" onClick={onComment} className="self-start transition-colors hover:text-zhu">
        {m.comment_section_title()} →
      </button>
    </div>
  )
}
