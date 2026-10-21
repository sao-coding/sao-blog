export type VoteType = 'like' | 'dislike' | null

export type CommentSortOrder = 'newest' | 'oldest'

export type CommentRefType = 'post' | 'note' | 'page' | 'recently'

export interface FlatComment {
  id: string
  refType: CommentRefType
  refId: string
  displayUsername: string
  image: string | null
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
  /** 公開 API 只會給 approved；自己還在審核中的留言是 pending */
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  updatedAt: string
}

export interface Comment {
  id: string
  displayUsername: string
  image: string | null
  email: string
  website?: string
  content: string
  createdAt: string
  liked: boolean        // ✅ 新增
  likes: number
  dislikes: number
  location: string | null  // 留言者歸屬地（由 IP 解析，不對外暴露 IP 本身）
  replies: Comment[]
  parentId: string | null
  /** 自己的留言還在審核中（其他人看不到） */
  pending: boolean
  /** 留言者 id，用來判斷是不是自己的留言（對話氣泡靠右） */
  userId: string
  /** 置頂留言 */
  pin: boolean
}