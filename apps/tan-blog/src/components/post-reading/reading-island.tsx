import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion, type Transition } from 'motion/react'
import { ListIcon, MessageSquareTextIcon, XIcon } from 'lucide-react'
import { m } from '#/paraglide/messages'
import { cn } from '@/lib/utils'
import { DURATION, EASE } from '@/lib/motion'
import type { TocItem } from '@/types/toc'
import { ReaderSeals, StampButton } from './stamp'
import { useStamps, type Reader } from './use-stamps'
import { ProgressLine } from './reading-panel'

// 手機的「閱讀島」（2026-11-02 站主要的，取代抽屜）：一個形狀在幾種樣子之間變形，不另開視窗。
//   dot  右下一個圓點：登入是自己的頭像（彩色），訪客是讀到幾 %；外面一圈墨越讀越滿
//   bar  點一下長成一條工具列：頭像（或 %）｜目錄｜蓋印｜留言｜收起
//   toc  點目錄，工具列再長成目錄面板（讀到的那節朱色，點了收回圓點再捲過去）
//   me   點頭像，長成「這一篇」：閱讀時間、進度、蓋印的讀者；訪客多一行登入
// 變形用 framer-motion 的 layout（外框的位置、大小、圓角一起補間），裡面的內容淡出淡入、稍微位移；
// 時間照 lib/motion.ts 的 move 曲線。紙底、髮絲線框，沒有陰影。點外面或往下捲就收回圓點。

type View = 'dot' | 'bar' | 'toc' | 'me'

const RING = 2 * Math.PI * 23

function flatToc(items: TocItem[], depth = 0): { item: TocItem; depth: number }[] {
  return items.flatMap((item) => [{ item, depth }, ...flatToc(item.children ?? [], depth + 1)])
}

export function ReadingIsland({
  postId,
  readingTime,
  progress,
  toc,
  activeId,
  onComment,
}: {
  postId: string
  readingTime: number
  progress: number
  toc: TocItem[]
  activeId?: string
  onComment: () => void
}) {
  const [view, setView] = useState<View>('dot')
  const { state, me, toggle } = useStamps(postId)
  const reduce = useReducedMotion()
  const box = useRef<HTMLDivElement>(null)
  const minutes = Math.max(1, Math.round(readingTime))

  const shape: Transition = reduce
    ? { duration: DURATION.out / 1000 }
    : { duration: 0.44, ease: [...EASE.move] as [number, number, number, number] }
  const inner: Transition = { duration: DURATION.in / 1000, ease: [...EASE.out] as [number, number, number, number], delay: reduce ? 0 : 0.12 }

  // 點外面、按 Esc、往下捲一段：收回圓點
  useEffect(() => {
    if (view === 'dot') return
    const onDown = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setView('dot')
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setView('dot')
    const y0 = window.scrollY
    const onScroll = () => {
      if (view !== 'toc' && Math.abs(window.scrollY - y0) > 120) setView('dot')
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll)
    }
  }, [view])

  const jump = (id: string) => {
    setView('dot')
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  const radius = view === 'dot' ? 26 : view === 'bar' ? 26 : 18

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-end px-4 lg:hidden">
      <motion.div
        ref={box}
        layout
        transition={shape}
        initial={false}
        animate={{ borderRadius: radius }}
        className={cn(
          'pointer-events-auto relative overflow-hidden border border-ink-5 bg-background',
          view === 'toc' || view === 'me' ? 'w-full max-w-md' : '',
        )}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {view === 'dot' && (
            <motion.button
              key="dot"
              type="button"
              layout="position"
              onClick={() => setView('bar')}
              aria-label={m.reading_open()}
              aria-expanded={false}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1, transition: inner }}
              exit={{ opacity: 0, scale: 0.8, transition: { duration: DURATION.out / 1000 } }}
              className="relative block size-[50px]"
            >
              <Face me={me} progress={progress} ring />
            </motion.button>
          )}

          {view === 'bar' && (
            <motion.div
              key="bar"
              layout="position"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0, transition: inner }}
              exit={{ opacity: 0, transition: { duration: DURATION.out / 1000 } }}
              className="flex h-[50px] items-center gap-1 pr-1.5 pl-1"
            >
              <IslandButton label={m.reading_about()} onClick={() => setView('me')} className="size-[42px]">
                <Face me={me} progress={progress} />
              </IslandButton>
              {toc.length > 0 && (
                <IslandButton label={m.reading_toc()} onClick={() => setView('toc')}>
                  <ListIcon className="size-5" />
                </IslandButton>
              )}
              {state && me && (
                <IslandButton label={state.liked ? m.stamp_undo() : m.stamp_do()} onClick={toggle} pressed={state.liked}>
                  <span className={cn('island-stamp', state.liked && 'island-stamp-on')}>{m.stamp_glyph()}</span>
                </IslandButton>
              )}
              <IslandButton
                label={m.comment_section_title()}
                onClick={() => {
                  setView('dot')
                  onComment()
                }}
              >
                <MessageSquareTextIcon className="size-5" />
              </IslandButton>
              <IslandButton label={m.reading_close()} onClick={() => setView('dot')}>
                <XIcon className="size-4 text-ink-3" />
              </IslandButton>
            </motion.div>
          )}

          {view === 'toc' && (
            <Panel key="toc" title={m.reading_toc()} onBack={() => setView('bar')} transition={inner}>
              <ol className="no-scrollbar max-h-[55dvh] space-y-2.5 overflow-y-auto pb-1">
                {flatToc(toc).map(({ item, depth }) => {
                  const id = item.href?.slice(1)
                  return (
                    <li key={item.href ?? item.value} style={{ paddingLeft: `${depth * 0.9}rem` }}>
                      <button
                        type="button"
                        onClick={() => id && jump(id)}
                        className={cn(
                          'text-left text-[15px] leading-snug transition-colors',
                          id === activeId ? 'text-zhu' : depth === 0 ? 'text-ink-1' : 'text-ink-2',
                        )}
                      >
                        {item.value}
                      </button>
                    </li>
                  )
                })}
              </ol>
            </Panel>
          )}

          {view === 'me' && (
            <Panel key="me" title={me?.name ?? m.reading_guest()} onBack={() => setView('bar')} transition={inner}>
              <div className="space-y-5 text-sm text-ink-3">
                <div>
                  <p className="mb-2 flex justify-between tabular-nums">
                    <span>{m.reading_minutes({ count: String(minutes) })}</span>
                    <span>{Math.round(progress * 100)}%</span>
                  </p>
                  <ProgressLine progress={progress} />
                </div>
                {state && (
                  <div className="flex items-start gap-3">
                    <StampButton state={state} me={me} onToggle={toggle} />
                    <div className="min-w-0 pt-0.5">
                      <p className="tabular-nums">{m.stamp_count({ count: String(state.likes) })}</p>
                      <ReaderSeals readers={state.readers.filter((r) => r.id !== me?.id || !state.liked)} size={22} className="mt-1.5" />
                    </div>
                  </div>
                )}
              </div>
            </Panel>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

/** 圓點的臉：登入是自己的頭像，訪客是讀到幾 %；ring 時外面一圈墨是進度 */
function Face({ me, progress, ring = false }: { me: Reader | null; progress: number; ring?: boolean }) {
  return (
    <>
      {ring && (
        <svg aria-hidden viewBox="0 0 52 52" className="absolute inset-0 size-full -rotate-90">
          <circle cx="26" cy="26" r="23" fill="none" stroke="var(--ink-2)" strokeWidth="2" strokeLinecap="round" strokeDasharray={RING} strokeDashoffset={RING * (1 - progress)} />
        </svg>
      )}
      {me?.image ? (
        <img
          src={me.image}
          alt=""
          referrerPolicy="no-referrer"
          className={cn(
            'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full object-cover',
            ring ? 'size-[34px]' : 'size-[34px]',
          )}
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center font-display text-sm text-ink-2 tabular-nums">
          {Math.round(progress * 100)}
        </span>
      )}
    </>
  )
}

function IslandButton({
  label,
  onClick,
  pressed,
  className,
  children,
}: {
  label: string
  onClick: () => void
  pressed?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={cn('relative flex size-10 shrink-0 items-center justify-center rounded-full text-ink-2 transition-colors active:text-zhu', className)}
    >
      {children}
    </button>
  )
}

function Panel({
  title,
  onBack,
  transition,
  children,
}: {
  title: string
  onBack: () => void
  transition: Transition
  children: ReactNode
}) {
  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0, transition }}
      exit={{ opacity: 0, transition: { duration: DURATION.out / 1000 } }}
      className="px-5 pt-3 pb-5 font-display"
    >
      <div className="mb-4 flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-sm text-ink-3 transition-colors active:text-zhu">
          ‹ {title}
        </button>
      </div>
      {children}
    </motion.div>
  )
}
