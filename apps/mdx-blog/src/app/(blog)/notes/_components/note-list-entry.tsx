import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { BookmarkIcon } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import type { NoteListItem } from '../_types'

export function NoteListEntry({ note }: { note: NoteListItem }) {
  const date = new Date(note.createdAt)

  return (
    <li>
      <Link
        href={`/notes/${note.id}`}
        className="group flex gap-4 transition-transform duration-150 hover:-translate-y-0.5 sm:gap-6"
      >
        <div className="flex w-14 shrink-0 flex-col items-center pt-4 text-center">
          <span className="text-2xl font-light leading-none">
            {format(date, 'dd')}
          </span>
          <span className="mt-1 text-xs text-muted-foreground">
            {format(date, 'M月', { locale: zhTW })}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(date, 'EEE', { locale: zhTW })}
          </span>
        </div>

        <div className="relative flex-1 border-t border-zinc-200/70 pt-4 dark:border-neutral-800">
          {note.bookmark && (
            <BookmarkIcon className="absolute top-4 right-0 size-4 fill-primary text-primary" />
          )}
          <Badge variant="secondary" className="mb-2">
            {note.mood}
          </Badge>
          <h3 className="text-lg font-semibold transition-colors group-hover:text-primary">
            {note.title}
          </h3>
          {note.excerpt && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {note.excerpt}
            </p>
          )}
          <span className="mt-2 inline-block text-sm text-primary italic transition-opacity group-hover:opacity-70">
            閱讀全文 →
          </span>
        </div>
      </Link>
    </li>
  )
}
