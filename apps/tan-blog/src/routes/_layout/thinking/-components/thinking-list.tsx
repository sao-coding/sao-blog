import type { CSSProperties } from 'react'
import { Link } from '@tanstack/react-router'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import type { InferClientOutputs } from '@orpc/client'
import type { client } from '@/lib/orpc'
import { dayjsLocale } from '@/lib/date-locale'
import { cn } from '@/lib/utils'
import { CommentMarkdownRenderer } from '@/components/comment/comment-markdown-renderer'
import { m } from '#/paraglide/messages'

dayjs.extend(relativeTime)

type Thinking = InferClientOutputs<typeof client>['thinking']['getThinkings']['data'][number]

// 便條紙色票：低彩度的紙色，深色背景上不刺眼。墨色用深褐而非純黑，像原子筆字。
const PAPERS = [
  { paper: 'oklch(0.9 0.06 95)', tape: 'oklch(0.78 0.05 190 / 0.55)' }, // 鵝黃
  { paper: 'oklch(0.88 0.04 190)', tape: 'oklch(0.8 0.06 20 / 0.5)' }, // 薄荷青
  { paper: 'oklch(0.89 0.04 20)', tape: 'oklch(0.82 0.05 95 / 0.6)' }, // 淡粉
  { paper: 'oklch(0.9 0.015 80)', tape: 'oklch(0.72 0.04 250 / 0.45)' }, // 米白
] as const

// 由 id 算出固定的「隨機」值，讓 SSR 與 hydration 結果一致，每張紙的歪斜也不會每次重整都變
function hash(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return Math.abs(h)
}

function noteStyle(id: string, index: number) {
  const h = hash(id)
  // 顏色依序輪替，確保相鄰兩張不同色；歪斜角度才用 id 雜湊
  const color = PAPERS[index % PAPERS.length]
  return {
    color,
    rotate: ((h >> 3) % 7) - 3, // -3° ~ 3°
    tapeRotate: ((h >> 6) % 11) - 5, // -5° ~ 5°
    tapeOffset: 30 + ((h >> 9) % 40), // 膠帶貼的位置 30%~70%
  }
}

export function ThinkingList({ items }: { items: Thinking[] }) {
  return (
    <ul className="columns-1 gap-8 sm:columns-2 lg:columns-3">
      {items.map((thinking, index) => {
        const { color, rotate, tapeRotate, tapeOffset } = noteStyle(thinking.id, index)
        const created = dayjs(thinking.createdAt)
        // 短短一句話就寫大一點，像隨手寫在便條上的字
        const isShort = thinking.content.trim().length <= 24

        return (
          <li
            key={thinking.id}
            className="mb-10 break-inside-avoid pt-3 animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500"
            style={{ animationDelay: `${Math.min(index, 12) * 50}ms` }}
          >
            <article
              style={
                {
                  '--paper': color.paper,
                  '--rotate': `${rotate}deg`,
                } as CSSProperties
              }
              className={cn(
                'group relative rotate-[var(--rotate)] bg-[var(--paper)] px-5 pt-7 pb-4 text-stone-800',
                'shadow-[0_1px_1px_rgb(0_0_0/0.15),0_10px_20px_-12px_rgb(0_0_0/0.6)]',
                'transition-[rotate,translate,box-shadow] duration-300 ease-out',
                'hover:rotate-0 hover:-translate-y-1 hover:shadow-[0_2px_2px_rgb(0_0_0/0.15),0_18px_30px_-14px_rgb(0_0_0/0.7)]',
                'motion-reduce:rotate-0 motion-reduce:transition-none',
                // 右下角微微捲起的陰影
                "after:pointer-events-none after:absolute after:right-0 after:bottom-0 after:size-6 after:bg-[linear-gradient(135deg,transparent_50%,rgb(0_0_0/0.08)_50%)] after:content-['']",
              )}
            >
              {/* 紙膠帶 */}
              <span
                aria-hidden
                className="absolute -top-3 h-6 w-20 -translate-x-1/2 opacity-90 [mask-image:linear-gradient(90deg,transparent_0,#000_4px,#000_calc(100%-4px),transparent_100%)]"
                style={{
                  left: `${tapeOffset}%`,
                  rotate: `${tapeRotate}deg`,
                  background: color.tape,
                }}
              />

              <div className={cn('font-wenkai', isShort ? 'text-xl leading-snug' : 'text-[15px] leading-relaxed')}>
                <CommentMarkdownRenderer
                  content={thinking.content}
                  className="text-inherit [font-size:inherit] [line-height:inherit] [&_*]:text-inherit [&_*]:[font-size:inherit] [&_*]:[line-height:inherit] prose-p:my-1.5 prose-a:underline prose-a:decoration-dashed"
                />
              </div>

              <footer className="mt-4 flex items-end justify-between gap-3 text-xs text-stone-600/80">
                {thinking.note ? (
                  <Link
                    to="/notes/$id"
                    params={{ id: thinking.note.id }}
                    className="min-w-0 truncate font-wenkai underline decoration-dashed underline-offset-4 hover:text-stone-900"
                  >
                    {m.thinking_from_note({ title: thinking.note.title })}
                  </Link>
                ) : (
                  <span />
                )}
                <time
                  dateTime={created.toISOString()}
                  title={created.format('YYYY-MM-DD HH:mm')}
                  className="shrink-0 font-mono tabular-nums"
                  suppressHydrationWarning
                >
                  {created.locale(dayjsLocale()).fromNow()}
                </time>
              </footer>
            </article>
          </li>
        )
      })}
    </ul>
  )
}
