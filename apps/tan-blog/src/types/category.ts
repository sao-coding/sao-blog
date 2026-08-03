export interface CategoryItem {
  id: string
  name: string
  slug: string
  description: string | null
  color: string | null
  parentId: string | null
  sortOrder: number
  postCount: number
  createdAt: string
  updatedAt: string
}
