import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { m } from '#/paraglide/messages'
import { cn } from '@/lib/utils'
import { DURATION, EASE } from '@/lib/motion'
import { openLoginDialog } from '@/store/login-dialog-store'
import { useStamps, type Reader, type StampState } from './use-stamps'

// 「蓋印」（原本的按讚，2026-11-02 站主要整個換掉）：
// 古畫看完，收藏的人在畫上蓋自己的鑑藏印——讀者讀完，在這封信上蓋一方自己的印。
// 每一方印是讀者的頭像（彩色），裁成微歪的方印、外面一道朱框；歪的角度由讀者 id 決定，每次都一樣。
// 只有登入的讀者能蓋；訪客看得到誰蓋過，蓋印的位置換成一行「登入後可以蓋印」。

function tilt(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return ((h % 9) + 9) % 9 - 4 // -4…4 度
}

/** 一方讀者的印：頭像裁成方印，朱框；沒有頭像就刻名字的第一個字 */
export function ReaderSeal({ reader, size = 28, className }: { reader: Reader; size?: number; className?: string }) {
  return (
    <span
      title={reader.name}
      className={cn('reader-seal', className)}
      style={{ width: size, height: size, rotate: `${tilt(reader.id)}deg` }}
    >
      {reader.image ? (
        <img src={reader.image} alt={reader.name} loading="lazy" referrerPolicy="no-referrer" />
      ) : (
        <span aria-label={reader.name} className="reader-seal-text">
          {reader.name.slice(0, 1)}
        </span>
      )}
    </span>
  )
}

/** 蓋過印的讀者：一排印，新的在前 */
export function ReaderSeals({ readers, size = 26, className }: { readers: Reader[]; size?: number; className?: string }) {
  if (readers.length === 0) return null
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      <AnimatePresence initial={false}>
        {readers.map((r) => (
          <motion.span
            key={r.id}
            layout
            initial={{ opacity: 0, scale: 1.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: DURATION.in / 1000, ease: EASE.out }}
          >
            <ReaderSeal reader={r} size={size} />
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  )
}

/**
 * 蓋印的位置：還沒蓋是一方朱色虛線框，裡面直書「蓋印」；蓋下去，自己的印從上方壓下來（放大→落定、微微一彈）。
 * 再按一次把印收回。
 */
export function StampButton({
  state,
  me,
  onToggle,
  className,
}: {
  state: StampState
  me: Reader | null
  onToggle: () => void
  className?: string
}) {
  const reduce = useReducedMotion()
  if (!me) {
    return (
      <button type="button" onClick={openLoginDialog} className={cn('font-display text-sm text-ink-3 transition-colors hover:text-zhu', className)}>
        {m.stamp_login()}
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={state.liked}
      aria-label={state.liked ? m.stamp_undo() : m.stamp_do()}
      title={state.liked ? m.stamp_undo() : m.stamp_do()}
      className={cn('group relative size-12 shrink-0', className)}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {state.liked ? (
          <motion.span
            key="sealed"
            className="absolute inset-0"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.8, y: -10 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, scale: [1.8, 0.92, 1], y: [-10, 0, 0] }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.42, ease: EASE.out, times: [0, 0.7, 1] }}
          >
            <ReaderSeal reader={me} size={48} />
          </motion.span>
        ) : (
          <motion.span
            key="empty"
            className="stamp-slot absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.out / 1000 }}
          >
            {m.stamp_do()}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}

/** 文末，落款底下：讀者蓋過的印排成一行，最後是自己蓋印的位置 */
export function EndStamps({ postId }: { postId: string }) {
  const { state, me, toggle } = useStamps(postId)
  if (!state) return null
  return (
    <div className="mt-10 flex flex-wrap items-center gap-3 font-display text-sm text-ink-3">
      <ReaderSeals readers={state.readers.filter((r) => r.id !== me?.id || !state.liked)} size={30} />
      <StampButton state={state} me={me} onToggle={toggle} />
      {state.likes > 0 && <span className="tabular-nums">{m.stamp_count({ count: String(state.likes) })}</span>}
    </div>
  )
}
