import { CategoryItem } from './category'
import { TagItem } from './tag'

// post 清單 不包含 content
export interface PostItem {
  id: string
  title: string
  summary: string | null
  content: string
  slug: string
  cover: string | null
  status: 'draft' | 'published' | 'archived'
  publishedAt: string | null
  viewCount: number
  likeCount: number
  commentCount: number
  allowComments: boolean
  pin: boolean
  pinOrder: number
  isSticky: boolean
  createdAt: string
  updatedAt: string
  category: CategoryItem
  tags: TagItem[]
  author: {
    id: string
    username: string
    displayUsername: string
    name: string | null
    email: string
    emailVerified: boolean
    image: string | null
    role: string | null
    banned: boolean
    banReason: string | null
    banExpires: string | null
    createdAt: string
    updatedAt: string
  }
}
