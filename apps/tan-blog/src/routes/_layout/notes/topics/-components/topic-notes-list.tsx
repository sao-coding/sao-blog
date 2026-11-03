import { NoteInTopicSchema } from '@sao-blog/api/schema/topic'
import { Link } from '@tanstack/react-router'
import { useMemo } from 'react'
import type z from 'zod'
import { TermMark } from '@/components/written-season'
import { GroupMark, oldProps } from '@/components/layout/list-parts'
import { m } from '#/paraglide/messages'
import { siteTime } from '@/lib/site-time'
import { anchorProps } from '@/lib/page-transition'

type NoteItem = z.infer<typeof NoteInTopicSchema>

interface YearGroup {
  year: number
  months: { key: string; label: string; items: NoteItem[] }[]
}

// 新→舊依「年 → 月」切段（站主時區）
function groupByYearAndMonth(notes: NoteItem[]): YearGroup[] {
  const years: YearGroup[] = []
  const sorted = [...notes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  for (const note of sorted) {
    const date = siteTime(note.createdAt)
    let year = years.at(-1)
    if (year?.year !== date.year()) {
      year = { year: date.year(), months: [] }
      years.push(year)
    }
    const key = date.format('YYYY-MM')
    let month = year.months.at(-1)
    if (month?.key !== key) {
      month = { key, label: date.format('MMMM'), items: [] }
      year.months.push(month)
    }
    month.items.push(note)
  }
  return years
}

// 專欄裡的日記：跟時間線同一套（年份大字、月份小字、一列一篇）。
// 進場（年份、月份、各列）由 _layout 換頁時統一排（lib/page-enter.ts 的 data-enter）
export function TopicNotesList({ notes }: { notes: NoteItem[] }) {
  const years = useMemo(() => groupByYearAndMonth(notes), [notes])

  return (
    <>
      {years.map(({ year, months }) => (
        <section key={year} className="mb-14">
          <GroupMark
            big={<time dateTime={String(year)}>{year}</time>}
            small={m.notes_total({ count: String(months.reduce((n, mo) => n + mo.items.length, 0)) })}
          />
          {months.map(({ key, label, items }) => (
            <div key={key} className="mt-6 first-of-type:mt-4">
              <h3 data-enter className="mb-1 font-display text-sm text-ink-3">
                {label}
              </h3>
              <ul>
                {items.map((note) => (
                  <li key={note.id} data-enter className="ink-row" {...oldProps(note.createdAt)}>
                    <Link
                      to="/notes/$id"
                      params={{ id: note.id }}
                      className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-baseline gap-x-4 py-2.5 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto] sm:gap-x-6"
                    >
                      <span className="flex items-baseline gap-2 text-sm text-ink-3 tabular-nums">
                        <time dateTime={siteTime(note.createdAt).toISOString()}>{siteTime(note.createdAt).format('DD')}</time>
                        <TermMark date={note.createdAt} className="hidden text-xs sm:inline" />
                      </span>
                      <span className="ink-title line-clamp-2 min-w-0 font-display sm:line-clamp-1" {...anchorProps(`/notes/${note.id}`)}>
                        {note.title}
                      </span>
                      <span className="col-start-2 font-display text-xs text-ink-3 sm:col-start-auto sm:text-sm">
                        {[note.weather, note.mood].filter(Boolean).join(' · ')}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </>
  )
}
