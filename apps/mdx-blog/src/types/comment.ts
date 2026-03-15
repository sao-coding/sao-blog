export type VoteType = 'like' | 'dislike' | null

export type CommentSortOrder = 'newest' | 'oldest'

export type CommentRefType = 'post' | 'note' | 'page' | 'recently'

export interface FlatComment {
  id: string
  refType: CommentRefType
  refId: string
  displayUsername: string
  email: string
  website: string | null
  content: string
  thread: string | null
  liked: boolean        // ✅ 新增：目前使用者是否已按讚
  likes: number
  dislikes: number
  deleted: boolean
  pin: boolean
  source: string
  userId: string
  ip: string | null
  agent: string | null
  location: string | null
  createdAt: string
  updatedAt: string
}

export interface Comment {
  id: string
  displayUsername: string
  email: string
  website?: string
  content: string
  createdAt: string
  liked: boolean        // ✅ 新增
  likes: number
  dislikes: number
  replies: Comment[]
  parentId: string | null
}