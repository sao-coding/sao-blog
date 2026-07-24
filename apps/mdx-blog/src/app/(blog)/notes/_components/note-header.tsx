import { format } from 'date-fns'
import { ClockIcon } from 'lucide-react'
import type { NoteItem } from '@/types/note'

interface NoteHeaderProps {
  note: Pick<NoteItem, 'title' | 'createdAt' | 'weather' | 'mood'>
}

// 日記標題區塊：標題 + 日期/天氣/心情，供詳情頁與首頁預覽卡片共用
export function NoteHeader({ note }: NoteHeaderProps) {
  return (
    <div>
      <h1 className="my-8 text-balance text-left text-4xl font-bold leading-tight text-base-content/95">
        {note.title}
      </h1>
      <span className="flex flex-wrap items-center text-sm text-neutral-content/60">
        <span className="inline-flex items-center space-x-1">
          <ClockIcon className="size-4" />
          <span>{format(new Date(note.createdAt), 'yyyy-MM-dd')}</span>
        </span>
        <span className="mx-2">•</span>
        <span className="inline-flex items-center space-x-1">
          <span>天氣</span>
          <span>{note.weather}</span>
        </span>
        <span className="mx-2">•</span>
        <span className="inline-flex items-center space-x-1">
          <span>心情</span>
          <span>{note.mood}</span>
        </span>
      </span>
    </div>
  )
}
