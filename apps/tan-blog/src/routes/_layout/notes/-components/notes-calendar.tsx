import { useEffect, useMemo, useState } from 'react'
import { ArrowUpIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { siteTime } from '@/lib/site-time'
import { cn } from '@/lib/utils'
import { m } from '#/paraglide/messages'
import type { JournalNote } from './notes-journal'

// 側欄的「寫作足跡」月曆：有寫日記的日子是濃墨加一筆底線、其他日子淡墨、今天朱色，點一下捲到那天的日記。
// 月份可前後切換，預設停在最新一篇所在的月份。
export function NotesCalendar({ notes }: { notes: JournalNote[] }) {
  // 每一天第一篇日記的 id（同一天多篇時捲到最新那篇）
  const byDay = useMemo(() => {
    const map = new Map<string, string>()
    for (const note of notes) {
      const key = siteTime(note.createdAt).format('YYYY-MM-DD')
      if (!map.has(key)) map.set(key, note.id)
    }
    return map
  }, [notes])

  const latest = notes[0] ? siteTime(notes[0].createdAt) : siteTime(new Date())
  const [month, setMonth] = useState(() => latest.startOf('month'))
  // 「今天」只在瀏覽器算，避免 SSR 與 hydration 跨日時對不上
  const [today, setToday] = useState<string | null>(null)
  useEffect(() => setToday(siteTime(new Date()).format('YYYY-MM-DD')), [])

  const first = month.startOf('month')
  const daysInMonth = month.daysInMonth()
  const leading = first.day() // 0 = 週日
  const cells: (number | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  const weekdays = Array.from({ length: 7 }, (_, i) => first.day(i).format('dd'))
  const monthKey = month.format('YYYY-MM')
  const monthCount = notes.filter((note) => siteTime(note.createdAt).format('YYYY-MM') === monthKey).length

  const scrollTo = (id: string) => {
    document.getElementById(`n-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <aside className="sticky top-28 flex flex-col gap-6 text-sm">
      <section>
        <h2 className="mb-3 font-display text-sm text-ink-3">{m.notes_footprint()}</h2>

        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMonth((d) => d.subtract(1, 'month'))}
            aria-label={m.notes_prev_month()}
            className="p-1 text-ink-3 transition-colors hover:text-zhu"
          >
            <ChevronLeftIcon className="size-4" />
          </button>
          <span className="font-display text-ink-1 tabular-nums">{month.format('YYYY.MM')}</span>
          <button
            type="button"
            onClick={() => setMonth((d) => d.add(1, 'month'))}
            aria-label={m.notes_next_month()}
            className="p-1 text-ink-3 transition-colors hover:text-zhu"
          >
            <ChevronRightIcon className="size-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
          {weekdays.map((w) => (
            <span key={w} className="pb-1 font-display text-[0.7rem] text-ink-3">
              {w}
            </span>
          ))}
          {cells.map((day, i) => {
            if (day === null) return <span key={`e-${i}`} />
            const key = month.date(day).format('YYYY-MM-DD')
            const noteId = byDay.get(key)
            const isToday = key === today
            return noteId ? (
              <button
                key={key}
                type="button"
                onClick={() => scrollTo(noteId)}
                title={key}
                className="mx-auto flex size-7 items-center justify-center text-ink-1 tabular-nums underline decoration-ink-4 underline-offset-4 transition-colors hover:text-zhu hover:decoration-zhu"
              >
                {day}
              </button>
            ) : (
              <span
                key={key}
                className={cn(
                  'mx-auto flex size-7 items-center justify-center text-ink-3 tabular-nums',
                  isToday && 'text-zhu',
                )}
              >
                {day}
              </span>
            )
          })}
        </div>

        <p className="mt-3 font-display text-sm text-ink-3">
          {m.notes_footprint_month({ count: String(monthCount) })}
        </p>
      </section>

      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="flex items-center gap-1.5 self-start font-display text-sm text-ink-3 transition-colors hover:text-zhu"
      >
        <ArrowUpIcon className="size-3.5" />
        {m.fab_back_to_top()}
      </button>
    </aside>
  )
}
