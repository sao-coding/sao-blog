import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'

// 文首的分類（2026-11-02 站主：不要直書，用留言區標題那樣的擺法）：
// 左邊一方朱文方印（刻分類名的第一個字，微歪），右邊橫寫分類名、下一行是標籤；整塊點分類名去分類頁。
export function CategorySeal({
  name,
  slug,
  tags,
  className,
}: {
  name: string
  slug: string
  tags: { name: string; slug: string }[]
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <Link to="/categories/$slug" params={{ slug }} aria-hidden tabIndex={-1} className="category-seal">
        {Array.from(name)[0]}
      </Link>
      <div className="min-w-0 font-display">
        <Link to="/categories/$slug" params={{ slug }} className="text-base text-ink-1 transition-colors hover:text-zhu">
          {name}
        </Link>
        {tags.length > 0 && (
          <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-ink-3">
            {tags.map((tag) => (
              <Link key={tag.slug} to="/posts" search={{ tag: tag.slug }} className="transition-colors hover:text-zhu">
                #{tag.name}
              </Link>
            ))}
          </p>
        )}
      </div>
    </div>
  )
}
