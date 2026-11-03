import type { ReactNode } from 'react'
import { SearchIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// 主題化的搜尋框外殼：文楷、虛線底線（聚焦時轉實線墨色），像在信箋上留一行空白。
// 輸入元素由呼叫端放進來：文章頁是一般 <input>，⌘K 是 cmdk 的 Command.Input（鍵盤導覽要靠它），
// 兩者都加上 className="search-field-input" 就會長得一樣。樣式在 search.css。
export function SearchField({
  label,
  size = 'sm',
  children,
  className,
}: {
  label?: string
  size?: 'sm' | 'lg'
  children: ReactNode
  className?: string
}) {
  return (
    <label className={cn('search-field', className)} data-size={size}>
      {label && <span className="search-field-label">{label}</span>}
      <span className="search-field-row">
        <SearchIcon aria-hidden className="search-field-icon" />
        {children}
      </span>
    </label>
  )
}
