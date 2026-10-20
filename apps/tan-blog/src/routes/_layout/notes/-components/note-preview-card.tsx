import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import type { NoteItem } from '@/types/note'
import { TermMark } from '@/components/written-season'
import { siteTime } from '@/lib/site-time'
import { m } from '#/paraglide/messages'

interface NotePreviewCardProps {
  note: NoteItem
  children: ReactNode
}

// /notes 最上方的「最新一篇」：像翻開的日記頁，只露出開頭一段，往下淡出，
// 附「繼續讀」連到完整頁面（含留言區）。
export function NotePreviewCard({ note, children }: NotePreviewCardProps) {
  const created = siteTime(note.createdAt)
  const meta = [note.weather && `${m.notes_weather()} ${note.weather}`, note.mood && `${m.notes_mood()} ${note.mood}`].filter(Boolean)

  return (
    <section id={`n-${note.id}`} className="relative scroll-mt-28 border-l-2 border-dashed border-ink/40 pl-5 sm:pl-8">
      <p className="mb-2 font-wenkai text-xs text-ink">{m.notes_latest()}</p>
      <h2 className="font-wenkai text-2xl leading-snug text-foreground sm:text-3xl">
        <Link to="/notes/$id" params={{ id: note.id }} className="transition-colors hover:text-ink">
          {note.title}
        </Link>
      </h2>
      <p className="mt-2 flex flex-wrap items-baseline gap-x-2 text-xs text-muted-foreground">
        <time dateTime={created.toISOString()} className="font-mono tabular-nums">
          {created.format('YYYY-MM-DD HH:mm')}
        </time>
        <TermMark date={note.createdAt} />
        {meta.map((item) => (
          <span key={item} className="font-wenkai">
            <span className="mr-2 opacity-50">·</span>
            {item}
          </span>
        ))}
      </p>

      <div className="relative mt-6 max-h-64 overflow-hidden [mask-image:linear-gradient(to_bottom,#000_60%,transparent)]">
        <article className="prose dark:prose-invert max-w-full note-content">{children}</article>
      </div>

      <Link
        to="/notes/$id"
        params={{ id: note.id }}
        className="mt-4 inline-block font-wenkai text-sm text-ink underline decoration-dashed underline-offset-4 hover:decoration-solid"
      >
        {m.notes_continue()} →
      </Link>
    </section>
  )
}
