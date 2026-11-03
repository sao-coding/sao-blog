import type { NoteItem } from '@/types/note'
import { WrittenOn } from '@/components/written-season'
import { anchorTitleStyle } from '@/lib/page-transition'
import { m } from '#/paraglide/messages'

interface NoteHeaderProps {
  note: Pick<NoteItem, 'title' | 'createdAt' | 'weather' | 'mood'>
  /** 錨字的 key（日記內頁的路徑），換頁時標題從列表那一列移過來 */
  anchor?: string
}

// 日記標題：跟文章頁同一套（文楷大標題＋一行「寫於 日期・節氣」），後面接天氣、心情
export function NoteHeader({ note, anchor }: NoteHeaderProps) {
  const meta = [
    note.weather && `${m.notes_weather()} ${note.weather}`,
    note.mood && `${m.notes_mood()} ${note.mood}`,
  ].filter(Boolean)
  return (
    <header>
      <h1
        className="font-display text-3xl leading-snug text-ink-1 text-balance sm:text-4xl"
        style={anchor ? anchorTitleStyle(anchor) : undefined}
      >
        {note.title}
      </h1>
      <p data-enter className="mt-3 flex flex-wrap items-baseline gap-x-3 text-sm text-ink-3">
        <WrittenOn date={note.createdAt} />
        {meta.map((item) => (
          <span key={item} className="font-display">
            {item}
          </span>
        ))}
      </p>
    </header>
  )
}
