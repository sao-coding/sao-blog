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

// 便條紙色票：同一明度（約 0.82）、低彩度的一家人，放在暖黑底上不刺眼也不打架。
// 色相集中在暖色系，只有「灰綠」呼應站上的青綠強調色 --ink。墨色統一在 .sticky-note。
const PAPERS = [
  "oklch(0.83 0.055 88)", // 牛皮黃
  "oklch(0.81 0.035 175)", // 灰綠
  "oklch(0.81 0.045 50)", // 杏桃
  "oklch(0.85 0.018 85)", // 未漂白紙
] as const

// 由 id 算出固定的「隨機」值，讓 SSR 與 hydration 結果一致，每張紙的歪斜也不會每次重整都變
function hash(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function ThinkingList({ items }: { items: Thinking[] }) {
  return (
    <ul className="columns-1 gap-8 sm:columns-2 lg:columns-3">
      {items.map((thinking, index) => {
        // 顏色依序輪替，確保相鄰兩張不同色；歪斜角度用 id 雜湊（-2.5° ~ 2.5°，手機減半）。
        // 手機版便條不撐滿寬度、左右交錯，維持「一張張便條」而不是橫幅卡片的比例。
        const paper = PAPERS[index % PAPERS.length]
        const rotate = ((hash(thinking.id) >> 3) % 11) / 2 - 2.5
        const created = dayjs(thinking.createdAt)
        // 短短一句話就寫大一點，像隨手寫在便條上的字
        const isShort = thinking.content.trim().length <= 24

        return (
          <li
            key={thinking.id}
            className="sticky-note-wrap mb-8 break-inside-avoid max-sm:w-[86%] max-sm:even:ml-auto sm:mb-12 animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500"
            style={{ animationDelay: `${Math.min(index, 12) * 50}ms` }}
          >
            <div
              style={{ "--tilt": `${rotate}deg` } as CSSProperties}
              className="origin-top rotate-[calc(var(--tilt)*0.5)] transition-[rotate,translate] duration-300 ease-out motion-reduce:transition-none sm:rotate-(--tilt) sm:hover:-translate-y-0.5 sm:hover:rotate-0"
            >
              <article style={{ "--paper": paper } as CSSProperties} className="sticky-note px-4 pt-8 pb-4 sm:px-5 sm:pt-9 sm:pb-5">
                <div className={cn("font-wenkai", isShort ? "text-xl leading-snug" : "text-[15px] leading-relaxed")}>
                  <CommentMarkdownRenderer
                    content={thinking.content}
                    className="text-inherit [font-size:inherit] [line-height:inherit] [&_*]:text-inherit [&_*]:[font-size:inherit] [&_*]:[line-height:inherit] prose-p:my-1.5 prose-a:underline prose-a:decoration-dashed"
                  />
                </div>

                <footer className="mt-5 flex items-end justify-between gap-3 text-xs opacity-60">
                  {thinking.note ? (
                    <Link
                      to="/notes/$id"
                      params={{ id: thinking.note.id }}
                      className="min-w-0 truncate font-wenkai underline decoration-dashed underline-offset-4 hover:opacity-100"
                    >
                      {m.thinking_from_note({ title: thinking.note.title })}
                    </Link>
                  ) : (
                    <span />
                  )}
                  <time
                    dateTime={created.toISOString()}
                    title={created.format("YYYY-MM-DD HH:mm")}
                    className="shrink-0 font-mono tabular-nums"
                    suppressHydrationWarning
                  >
                    {created.locale(dayjsLocale()).fromNow()}
                  </time>
                </footer>
              </article>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
