import type { NoteItem } from '@/types/note'

export type NoteListItem = {
  id: string
  title: string
  createdAt: string | Date
  mood: string
  bookmark: boolean
  excerpt: string
}

export type NotesHomeData = {
  current: NoteItem | null
  list: NoteListItem[]
}
