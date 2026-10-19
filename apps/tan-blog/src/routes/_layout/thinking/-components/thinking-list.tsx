import type { CSSProperties } from 'react'
import { Link } from '@tanstack/react-router'
import dayjs, { type Dayjs } from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import type { InferClientOutputs } from '@orpc/client'
import type { client } from '@/lib/orpc'
import { dayjsLocale } from '@/lib/date-locale'
import { cn } from '@/lib/utils'
import { CommentMarkdownRenderer } from '@/components/comment/comment-markdown-renderer'
import { m } from '#/paraglide/messages'
import { TermMark } from '@/components/written-season'

dayjs.extend(relativeTime)
dayjs.extend(utc)
dayjs.extend(timezone)

type Thinking = InferClientOutputs<typeof client>['thinking']['getThinkings']['data'][number]

// 分組與時間一律用站主所在時區計算：伺服器與瀏覽器時區可能不同，
// 用執行環境時區會讓 SSR 與 hydration 分到不同的「那一天」。
const SITE_TZ = 'Asia/Taipei'
const local = (d: Date | string) => dayjs(d).tz(SITE_TZ).locale(dayjsLocale())

const MARKDOWN_CLASS =
  'text-inherit [font-size:inherit] [line-height:inherit] [&_*]:text-inherit [&_*]:[font-size:inherit] [&_*]:[line-height:inherit] prose-p:my-1.5 prose-a:underline prose-a:decoration-dashed'

// 短短一句話就寫大一點，像隨手寫下的字
const isShort = (t: Thinking) => t.content.trim().length <= 24

interface DayGroup {
  key: string
  date: Dayjs
  items: Thinking[]
}
interface MonthGroup {
  key: string
  date: Dayjs
  days: DayGroup[]
}

// 已依時間新→舊排序的清單，切成「月 → 日」兩層
function groupByMonthAndDay(items: Thinking[]): MonthGroup[] {
  const months: MonthGroup[] = []
  for (const item of items) {
    const date = local(item.createdAt)
    const monthKey = date.format('YYYY-MM')
    const dayKey = date.format('YYYY-MM-DD')
    let month = months.at(-1)
    if (month?.key !== monthKey) {
      month = { key: monthKey, date, days: [] }
      months.push(month)
    }
    let day = month.days.at(-1)
    if (day?.key !== dayKey) {
      day = { key: dayKey, date, items: [] }
      month.days.push(day)
    }
    day.items.push(item)
  }
  return months
}

export function ThinkingList({ items }: { items: Thinking[] }) {
  const [latest, ...rest] = items
  const months = groupByMonthAndDay(rest)

  return (
    <div>
      {latest && <LatestNote thinking={latest} />}

      {months.map((month) => (
        <section key={month.key} className="mt-14 first:mt-0">
          <h2 className="mb-6 flex items-baseline gap-2 border-b border-rule pb-2 font-wenkai">
            <span className="text-4xl leading-none text-ink/30 tabular-nums select-none">{month.date.format('MM')}</span>
            <span className="font-mono text-xs text-muted-foreground">{month.date.format('YYYY')}</span>
          </h2>

          <ol className="flex flex-col gap-8">
            {month.days.map((day) => (
              <li
                key={day.key}
                className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-x-4 sm:grid-cols-[4rem_minmax(0,1fr)] sm:gap-x-6"
              >
                <CalendarLeaf date={day.date} />
                <div className="min-w-0">
                  {day.items.map((thinking) => (
                    <ThinkingEntry key={thinking.id} thinking={thinking} />
                  ))}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}

// 撕下來的一頁日曆：上緣虛線是撕痕，上方星期、下方大號日期。
// 桌機 sticky，同一天有多則時捲動中日期會一直留在左側。
function CalendarLeaf({ date }: { date: Dayjs }) {
  return (
    <div className="sm:sticky sm:top-24 sm:self-start">
      <time
        dateTime={date.format('YYYY-MM-DD')}
        className="flex flex-col items-center rounded-b-sm border border-t-2 border-rule border-t-ink/40 bg-ink-soft pt-1 pb-1.5 [border-top-style:dashed]"
      >
        <span className="font-wenkai text-[0.7rem] leading-tight text-muted-foreground">{date.format('ddd')}</span>
        <span className="font-wenkai text-2xl leading-none text-ink tabular-nums sm:text-3xl">{date.format('D')}</span>
      </time>
    </div>
  )
}

function ThinkingEntry({ thinking }: { thinking: Thinking }) {
  const created = local(thinking.createdAt)
  return (
    <article className="border-b border-dashed border-rule pb-5 last:border-b-0 not-first:pt-5">
      <div
        className={cn(
          'font-wenkai text-foreground/90',
          isShort(thinking) ? 'text-xl leading-snug' : 'text-[15px] leading-relaxed',
        )}
      >
        <CommentMarkdownRenderer content={thinking.content} className={MARKDOWN_CLASS} />
      </div>
      <footer className="mt-2 flex flex-wrap items-baseline gap-x-3 text-xs text-muted-foreground">
        <time
          dateTime={created.toISOString()}
          title={created.format('YYYY-MM-DD HH:mm')}
          className="font-mono tabular-nums"
        >
          {created.format('HH:mm')}
        </time>
        <TermMark date={thinking.createdAt} />
        {thinking.note && (
          <Link
            to="/notes/$id"
            params={{ id: thinking.note.id }}
            className="font-wenkai underline decoration-dashed underline-offset-4 hover:text-ink"
          >
            {m.thinking_from_note({ title: thinking.note.title })}
          </Link>
        )}
      </footer>
    </article>
  )
}

// 最新一則仍貼成便條紙（.sticky-note 定義在 styles.css），當作這頁的焦點
function LatestNote({ thinking }: { thinking: Thinking }) {
  const created = local(thinking.createdAt)
  return (
    <div className="sticky-note-wrap mb-16 max-w-sm">
      <p className="mb-3 font-wenkai text-xs text-muted-foreground">{m.thinking_latest()}</p>
      <div className="origin-top -rotate-1 transition-[rotate,translate] duration-300 ease-out motion-reduce:transition-none sm:hover:-translate-y-0.5 sm:hover:rotate-0">
        <article style={{ '--paper': 'oklch(0.88 0.022 85)' } as CSSProperties} className="sticky-note px-5 pt-9 pb-5">
          {/* 紙膠帶（.washi-tape 定義在 styles.css），斜斜跨過便條上緣 */}
          <span aria-hidden className="washi-tape" />
          <div
            className={cn('font-wenkai', isShort(thinking) ? 'text-xl leading-snug' : 'text-[15px] leading-relaxed')}
          >
            <CommentMarkdownRenderer content={thinking.content} className={MARKDOWN_CLASS} />
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
              title={created.format('YYYY-MM-DD HH:mm')}
              className="shrink-0 font-mono tabular-nums"
              suppressHydrationWarning
            >
              {created.fromNow()}
            </time>
          </footer>
        </article>
      </div>
    </div>
  )
}
