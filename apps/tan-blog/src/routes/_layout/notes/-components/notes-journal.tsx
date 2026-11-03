import { Link } from '@tanstack/react-router'
import type { Dayjs } from 'dayjs'
import { m } from '#/paraglide/messages'
import { getLocale } from '#/paraglide/runtime'
import { TermMark } from '@/components/written-season'
import { siteTime } from '@/lib/site-time'
import { anchorProps } from '@/lib/page-transition'
import { GroupMark, ListRow, rowLinkClass } from '@/components/layout/list-parts'

export interface JournalNote {
  id: string
  title: string
  createdAt: string | Date
  weather?: string | null
  mood?: string | null
  bookmark?: boolean
  excerpt?: string
}

interface MonthGroup {
  key: string
  date: Dayjs
  notes: JournalNote[]
}

// 已依時間新→舊排序的清單，依月份切段（站主時區）
function groupByMonth(notes: JournalNote[]): MonthGroup[] {
  const months: MonthGroup[] = []
  for (const note of notes) {
    const date = siteTime(note.createdAt)
    const key = date.format('YYYY-MM')
    const last = months.at(-1)
    if (last?.key === key) last.notes.push(note)
    else months.push({ key, date, notes: [note] })
  }
  return months
}

// 日記本：依月份分段，每一篇一列（日期＋標題＋摘要，components/layout/list-parts.tsx）
export function NotesJournal({ notes }: { notes: JournalNote[] }) {
  const months = groupByMonth(notes)

  return (
    <div>
      {months.map((month) => (
        <section key={month.key} className="mt-14 first:mt-0">
          <GroupMark id={`m-${month.key}`} big={month.date.format('MM')} small={month.date.format('YYYY')} />
          {month.notes.map((note, i) => (
            <JournalEntry key={note.id} note={note} sameDay={i > 0 && sameDay(month.notes[i - 1], note)} />
          ))}
        </section>
      ))}
    </div>
  )
}

const HAN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十']

/** 信上寫日子的漢字：一…十、十一…十九、二十、廿一…廿九、三十、卅一 */
export function hanDay(d: number) {
  if (d <= 10) return HAN[d]
  if (d < 20) return `十${HAN[d - 10]}`
  if (d === 20) return '二十'
  if (d < 30) return `廿${HAN[d - 20]}`
  if (d === 30) return '三十'
  return `卅${HAN[d - 30]}`
}

const sameDay = (a: JournalNote, b: JournalNote) =>
  siteTime(a.createdAt).format('YYYY-MM-DD') === siteTime(b.createdAt).format('YYYY-MM-DD')

function JournalEntry({ note, sameDay }: { note: JournalNote; sameDay: boolean }) {
  const created = siteTime(note.createdAt)
  const meta = [note.weather, note.mood].filter(Boolean)

  return (
    <ListRow
      id={`n-${note.id}`}
      writtenAt={note.createdAt}
      // 同一天的第二篇起不再寫日期，只留時刻
      date={
        <time dateTime={created.toISOString()}>
          {!sameDay &&
            (getLocale() === 'zh-Hant' ? (
              // 中文像信的落款：日子寫成漢字（廿三日），月份已經在上面的分段
              <span lang="zh-Hant" className="block font-display text-lg leading-none whitespace-nowrap text-ink-1 sm:text-xl">
                {hanDay(created.date())}
                <span className="text-sm text-ink-3">日</span>
              </span>
            ) : (
              <span className="block font-display text-2xl leading-none text-ink-2">{created.format('D')}</span>
            ))}
          <span className="mt-1.5 block">{sameDay || getLocale() === 'zh-Hant' ? created.format('HH:mm') : created.format('ddd')}</span>
        </time>
      }
      title={
        <Link to="/notes/$id" params={{ id: note.id }} className={rowLinkClass}>
          <span {...anchorProps(`/notes/${note.id}`)}>{note.title}</span>
          {/* 書籤：標題後一點朱 */}
          {note.bookmark && (
            <span className="ml-2 align-middle text-sm text-zhu" title={m.notes_bookmark()}>
              ●
            </span>
          )}
        </Link>
      }
      summary={note.excerpt}
      meta={
        <>
          {!sameDay && getLocale() !== 'zh-Hant' && <span className="tabular-nums">{created.format('HH:mm')}</span>}
          <TermMark date={note.createdAt} />
          {meta.map((item) => (
            <span key={item} className="font-display">
              {item}
            </span>
          ))}
        </>
      }
    />
  )
}
