/**
 * 留言相關型別定義
 * @module types/comment
 */

/** 單則留言資料型別 */
export interface Comment {
  /** 留言唯一 ID */
  id: string
  /** 暱稱 */
  displayUsername: string
  /** 電子郵件 */
  email: string
  /** 個人網址（選填） */
  website?: string
  /** 留言內容（Markdown 格式） */
  content: string
  /** 建立時間（ISO 8601 格式） */
  createdAt: string
  /** 按讚數 */
  likes: number
  /** 倒讚數 */
  dislikes: number
  /** 回覆列表 */
  replies: Comment[]
  /** 父留言 ID（回覆用），頂層留言為 null */
  parentId: string | null
}

/** 新增留言表單資料 */
export interface CommentFormData {
  /** 暱稱 */
  displayUsername: string
  /** 電子郵件 */
  email: string
  /** 個人網址（選填） */
  website?: string
  /** 留言內容（Markdown 格式） */
  content: string
}

/** 留言排序方式 */
export type CommentSortOrder = 'newest' | 'oldest'

/** 使用者對單則留言的投票狀態 */
export type VoteType = 'like' | 'dislike' | null
