import { FileIcon, FileTextIcon, ImageIcon, type LucideIcon } from 'lucide-react'

export type FileCategory = 'image' | 'document' | 'other'

export interface FileCategoryConfig {
  key: FileCategory
  label: string
  accept: string
  preview: 'thumbnail' | 'icon'
  icon: LucideIcon
}

/**
 * 檔案分類定義：檔案管理頁的篩選列、上傳 accept 限制、卡片渲染方式都由此陣列驅動。
 * 未來要新增分類，只需在這裡加一筆設定（並同步 packages/db 的 file_category enum）。
 */
export const FILE_CATEGORIES: FileCategoryConfig[] = [
  { key: 'image', label: '圖片', accept: 'image/*', preview: 'thumbnail', icon: ImageIcon },
  {
    key: 'document',
    label: '文件',
    accept: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,text/plain',
    preview: 'icon',
    icon: FileTextIcon,
  },
  { key: 'other', label: '其他', accept: '*', preview: 'icon', icon: FileIcon },
]

export function getFileCategoryConfig(category: FileCategory): FileCategoryConfig {
  return FILE_CATEGORIES.find((c) => c.key === category) ?? FILE_CATEGORIES[FILE_CATEGORIES.length - 1]
}
