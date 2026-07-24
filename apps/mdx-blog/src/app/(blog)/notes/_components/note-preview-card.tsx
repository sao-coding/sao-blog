import Link from 'next/link'
import type { ReactNode } from 'react'
import type { NoteItem } from '@/types/note'
import { NoteHeader } from './note-header'

interface NotePreviewCardProps {
  note: NoteItem
  children: ReactNode
}

// /notes 首頁的預覽卡片：只顯示最新一篇的節錄，不含留言區，
// 內容超出高度就裁切，並附上「閱讀全文」連結導向 /notes/[id] 的完整頁面。
export function NotePreviewCard({ note, children }: NotePreviewCardProps) {
  return (
    <div className="lg:p-[30px_45px] p-[2rem_1rem] bg-white dark:bg-zinc-900 border-zinc-200/70 dark:border-neutral-800 border note-card-enter">
      <NoteHeader note={note} />

      <div className="relative mt-10 max-h-[max(calc(100vh-40rem),500px)] overflow-hidden">
        <article className="prose dark:prose-invert max-w-full note-content">
          {children}
        </article>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent dark:from-zinc-900" />
      </div>

      <div className="mt-6 text-right">
        <Link
          href={`/notes/${note.id}`}
          className="text-primary hover:underline"
        >
          閱讀全文 →
        </Link>
      </div>
    </div>
  )
}
