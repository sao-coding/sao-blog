import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import type { NoteItem } from '@/types/note'
import { TermMark } from '@/components/written-season'
import { siteTime } from '@/lib/site-time'
import { m } from '#/paraglide/messages'
import { anchorProps } from '@/lib/page-transition'

interface NotePreviewCardProps {
  note: NoteItem
  children: ReactNode
}

// /notes 最上方的「最新一篇」：直接寫在紙上，只露出開頭兩段（不淡出、不加框），
// 接「繼續讀 →」連到完整頁面（含留言區）。
export function NotePreviewCard({ note, children }: NotePreviewCardProps) {
  const created = siteTime(note.createdAt)
  const meta = [note.weather && `${m.notes_weather()} ${note.weather}`, note.mood && `${m.notes_mood()} ${note.mood}`].filter(Boolean)

  return (
    <section id={`n-${note.id}`} data-enter className="ink-row scroll-mt-28">
      <p className="mb-2 font-display text-sm text-zhu">{m.notes_latest()}</p>
      <h2 className="font-display text-2xl leading-snug text-balance sm:text-3xl">
        <Link to="/notes/$id" params={{ id: note.id }} className="ink-title">
          <span {...anchorProps(`/notes/${note.id}`)}>{note.title}</span>
        </Link>
      </h2>
      <p className="mt-2 flex flex-wrap items-baseline gap-x-3 text-sm text-ink-3">
        <time dateTime={created.toISOString()} className="tabular-nums">
          {created.format('YYYY-MM-DD HH:mm')}
        </time>
        <TermMark date={note.createdAt} />
        {meta.map((item) => (
          <span key={item} className="font-display">
            {item}
          </span>
        ))}
      </p>

      {/* 只留開頭兩段，在段落之間收住，不在半行切斷 */}
      <article className="prose dark:prose-invert note-content mt-6 max-w-full [&_.mdx-wrapper>*:nth-child(n+3)]:hidden">
        {children}
      </article>

      <Link
        to="/notes/$id"
        params={{ id: note.id }}
        className="mt-2 inline-block font-display text-sm text-ink-3 transition-colors hover:text-zhu"
      >
        {m.notes_continue()} →
      </Link>
    </section>
  )
}
