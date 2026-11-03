import { Link } from '@tanstack/react-router'
import dayjs, { type Dayjs } from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import type { InferClientOutputs } from '@orpc/client'
import type { client } from '@/lib/orpc'
import { siteTime } from '@/lib/site-time'
import { GroupMark, oldProps } from '@/components/layout/list-parts'
import { CrumpledPaper } from './crumpled-paper'
import { cn } from '@/lib/utils'
import { CommentMarkdownRenderer } from '@/components/comment/comment-markdown-renderer'
import { m } from '#/paraglide/messages'
import { TermMark } from '@/components/written-season'

dayjs.extend(relativeTime)

type Thinking = InferClientOutputs<typeof client>['thinking']['getThinkings']['data'][number]

// 分組與時間一律用站主所在時區（見 lib/site-time.ts）
const local = siteTime

const MARKDOWN_CLASS =
  'text-inherit [font-size:inherit] [line-height:inherit] [&_*]:text-inherit [&_*]:[font-size:inherit] [&_*]:[line-height:inherit] prose-p:my-1.5 prose-a:underline prose-a:decoration-ink-4 prose-a:underline-offset-4'

// 短短一句話就寫大一點，像隨手寫下的字
const isShort = (t: Thinking) => t.content.trim().length <= 24

interface MonthGroup {
  key: string
  date: Dayjs
  items: Thinking[]
}

// 已依時間新→舊排序的清單，依月份切段
function groupByMonth(items: Thinking[]): MonthGroup[] {
  const months: MonthGroup[] = []
  for (const item of items) {
    const date = local(item.createdAt)
    const key = date.format('YYYY-MM')
    const last = months.at(-1)
    if (last?.key === key) last.items.push(item)
    else months.push({ key, date, items: [item] })
  }
  return months
}

export function ThinkingList({ items }: { items: Thinking[] }) {
  const [latest, ...rest] = items
  const months = groupByMonth(rest)

  return (
    <div>
      {latest && <LatestThought thinking={latest} />}

      {months.map((month) => (
        <section key={month.key} className="mt-14 first:mt-0">
          <GroupMark big={month.date.format('MM')} small={month.date.format('YYYY')} />
          {month.items.map((thinking, i) => (
            <ThinkingEntry
              key={thinking.id}
              thinking={thinking}
              sameDay={i > 0 && local(month.items[i - 1].createdAt).isSame(local(thinking.createdAt), 'day')}
            />
          ))}
        </section>
      ))}
    </div>
  )
}

// 一則：左邊日期（同一天的第二則起只寫時刻），右邊就是那句話；沒有標題、沒有框
function ThinkingEntry({ thinking, sameDay }: { thinking: Thinking; sameDay: boolean }) {
  const created = local(thinking.createdAt)
  return (
    <article data-enter {...oldProps(thinking.createdAt)} className="ink-row grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-4 py-4 sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:gap-x-6">
      <time
        dateTime={created.toISOString()}
        title={created.format('YYYY-MM-DD HH:mm')}
        className="pt-1 text-sm leading-snug text-ink-3 tabular-nums"
      >
        {!sameDay && <span className="block font-display text-2xl leading-none text-ink-2">{created.format('D')}</span>}
        <span className="mt-1 block">{sameDay ? created.format('HH:mm') : created.format('ddd')}</span>
      </time>
      <div className="min-w-0">
        <div className={cn('font-display text-ink-1 in-data-old:text-ink-2', isShort(thinking) ? 'text-xl leading-snug' : 'text-[15px] leading-relaxed')}>
          <CommentMarkdownRenderer content={thinking.content} className={MARKDOWN_CLASS} />
        </div>
        <footer className="mt-2 flex flex-wrap items-baseline gap-x-3 text-sm text-ink-3">
          {!sameDay && <span className="tabular-nums">{created.format('HH:mm')}</span>}
          <TermMark date={thinking.createdAt} />
          {thinking.note && <FromNote note={thinking.note} />}
        </footer>
      </div>
    </article>
  )
}

// 最新一則寫大一點，寫在一張揉過又攤開的紙上（crumpled-paper.tsx），當這頁的開頭
function LatestThought({ thinking }: { thinking: Thinking }) {
  const created = local(thinking.createdAt)
  return (
    <section data-enter className="relative isolate mb-16 max-w-xl px-7 py-8 sm:px-9 sm:py-10">
      <CrumpledPaper seed={thinking.id} />
      <p className="mb-3 font-display text-sm text-zhu">{m.thinking_latest()}</p>
      <div className={cn('font-display text-ink-1', isShort(thinking) ? 'text-3xl leading-snug text-balance' : 'text-lg leading-relaxed')}>
        <CommentMarkdownRenderer content={thinking.content} className={MARKDOWN_CLASS} />
      </div>
      <footer className="mt-4 flex flex-wrap items-baseline gap-x-3 text-sm text-ink-3">
        <time
          dateTime={created.toISOString()}
          title={created.format('YYYY-MM-DD HH:mm')}
          className="tabular-nums"
          suppressHydrationWarning
        >
          {created.fromNow()}
        </time>
        <TermMark date={thinking.createdAt} />
        {thinking.note && <FromNote note={thinking.note} />}
      </footer>
    </section>
  )
}

function FromNote({ note }: { note: NonNullable<Thinking['note']> }) {
  return (
    <Link to="/notes/$id" params={{ id: note.id }} className="font-display transition-colors hover:text-zhu">
      {m.thinking_from_note({ title: note.title })}
    </Link>
  )
}
