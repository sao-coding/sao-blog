// src/types/note.ts
export interface Note {
  id: string
  title: string
  content: string
  mood: string
  weather: string
  bookmark: boolean
  status: boolean
  coordinates: string | null
  location: string | null
  createdAt: string
  updatedAt: string
  topicId: string | null
}
export interface NoteItem extends Omit<Note, 'topicId'> {
  topic: {
    id: string
    name: string
  } | null
}
