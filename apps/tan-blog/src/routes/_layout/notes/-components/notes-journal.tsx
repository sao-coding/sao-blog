import { Link } from '@tanstack/react-router'
import type { Dayjs } from 'dayjs'
import { BookmarkIcon } from 'lucide-react'
import { CalendarLeaf } from '@/components/calendar-leaf'
import { TermMark } from '@/components/written-season'
import { siteTime } from '@/lib/site-time'
import { inkDryness } from '@/lib/season-spec'
import { cn } from '@/lib/utils'

export interface JournalNote {
  id: string
  title: string
  createdAt: string | Date
  weather?: string | null
  mood?: string | null
  bookmark?: boolean
  excerpt?: string
}

interface DayGroup {
  key: string
  date: Dayjs
  notes: JournalNote[]
}
interface MonthGroup {
  key: string
  date: Dayjs
  days: DayGroup[]
}

// 已依時間新→舊排序的清單，切成「月 → 日」兩層（站主時區）
function groupByMonthAndDay(notes: JournalNote[]): MonthGroup[] {
  const months: MonthGroup[] = []
  for (const note of notes) {
    const date = siteTime(note.createdAt)
    const monthKey = date.format('YYYY-MM')
    const dayKey = date.format('YYYY-MM-DD')
    let month = months.at(-1)
    if (month?.key !== monthKey) {
      month = { key: monthKey, date, days: [] }
      months.push(month)
    }
    let day = month.days.at(-1)
    if (day?.key !== dayKey) {
      day = { key: dayKey, date, notes: [] }
      month.days.push(day)
    }
    day.notes.push(note)
  }
  return months
}

// 日記本：依月份分組，同一天的日記共用一張撕下來的日曆紙
export function NotesJournal({ notes }: { notes: JournalNote[] }) {
  const months = groupByMonthAndDay(notes)

  return (
    <div>
      {months.map((month) => (
        <section key={month.key} id={`m-${month.key}`} className="mt-14 scroll-mt-28 first:mt-0">
          <h2 data-enter className="mb-6 flex items-baseline gap-2 border-b border-rule pb-2 font-wenkai">
            <span className="text-4xl leading-none text-ink/30 tabular-nums select-none">{month.date.format('MM')}</span>
            <span className="font-mono text-sm text-muted-foreground">{month.date.format('YYYY')}</span>
          </h2>

          <ol className="flex flex-col gap-8">
            {month.days.map((day) => (
              <li
                key={day.key}
                className="grid grid-cols-[3.75rem_minmax(0,1fr)] gap-x-4 sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:gap-x-6"
              >
                <CalendarLeaf date={day.date} />
                <div className="min-w-0">
                  {day.notes.map((note) => (
                    <JournalEntry key={note.id} note={note} />
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

function JournalEntry({ note }: { note: JournalNote }) {
  const created = siteTime(note.createdAt)
  const meta = [note.weather, note.mood].filter(Boolean)

  return (
    <article
      id={`n-${note.id}`}
      className={cn(
        'ink-row',
        `ink-${inkDryness(note.createdAt)}`,
        'group relative scroll-mt-28 border-b border-dashed border-rule pb-5 last:border-b-0 not-first:pt-5',
      )}
    >
      <h3 className="flex items-start justify-between gap-3 ink-title font-wenkai text-lg leading-snug sm:text-xl">
        <Link
          to="/notes/$id"
          params={{ id: note.id }}
          className="bg-[linear-gradient(var(--ink),var(--ink))] bg-no-repeat [background-position:0_100%] [background-size:0%_1px] transition-[background-size] duration-500 ease-out group-hover:[background-size:100%_1px] after:absolute after:inset-0 after:content-['']"
        >
          {note.title}
        </Link>
        {note.bookmark && <BookmarkIcon className="mt-1 size-4 shrink-0 fill-ink text-ink" />}
      </h3>
      {note.excerpt && (
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{note.excerpt}</p>
      )}
      <footer className="mt-2 flex flex-wrap items-baseline gap-x-2 text-sm text-muted-foreground">
        <time dateTime={created.toISOString()} className="font-mono tabular-nums">
          {created.format('HH:mm')}
        </time>
        <TermMark date={note.createdAt} />
        {meta.map((item) => (
          <span key={item} className="font-wenkai">
            <span className="mr-2 opacity-50">·</span>
            {item}
          </span>
        ))}
      </footer>
    </article>
  )
}
