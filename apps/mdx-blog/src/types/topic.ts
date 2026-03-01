// src/types/topic.ts
export interface TopicItem {
  id: string
  name: string
  slug: string
  introduce: string
  description: string | null
  noteCount: number
  createdAt: string
  updatedAt: string
}
