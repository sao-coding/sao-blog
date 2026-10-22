import { Link } from '@tanstack/react-router'
import { useState, useRef, useEffect } from 'react'
import { TermMark } from '@/components/written-season'
import { siteTime } from '@/lib/site-time'

interface Article {
  id: string
  title: string
  slug: string
  createdAt: Date | string
  updatedAt: Date | string
}

interface CategoriesTimelineProps {
  articles: Article[]
}

export function CategoriesTimeline({ articles }: CategoriesTimelineProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [indicatorStyle, setIndicatorStyle] = useState({ top: 0, height: 0 })
  const listRef = useRef<HTMLUListElement>(null)
  const itemRefs = useRef<(HTMLLIElement | null)[]>([])

  useEffect(() => {
    if (hoveredIndex !== null && itemRefs.current[hoveredIndex] && listRef.current) {
      const item = itemRefs.current[hoveredIndex]
      const list = listRef.current
      if (item) {
        const itemRect = item.getBoundingClientRect()
        const listRect = list.getBoundingClientRect()
        setIndicatorStyle({
          top: itemRect.top - listRect.top,
          height: itemRect.height,
        })
      }
    }
  }, [hoveredIndex])

  return (
    <div className="relative">
      <div
        className="absolute -left-px w-[2px] bg-primary transition-all duration-300 ease-out"
        style={{
          top: indicatorStyle.top,
          height: indicatorStyle.height,
          opacity: hoveredIndex !== null ? 1 : 0,
        }}
      />

      <ul
        ref={listRef}
        className="relative sao-timeline"
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {articles.map((article, index) => {
          const date = new Date(article.createdAt)
          const formattedDate = siteTime(date).format('YYYY-MM-DD')

          return (
            <li
              key={article.id}
              ref={(el) => { itemRefs.current[index] = el }}
              onMouseEnter={() => setHoveredIndex(index)}
              className="group"
            >
              <Link
                to="/posts/$slug"
                params={{ slug: article.slug }}
                className="flex items-baseline gap-4 py-3 pl-6 font-wenkai transition-colors md:gap-6"
              >
                <span className="flex w-24 shrink-0 items-baseline gap-2 text-sm md:w-36">
                  <time className="text-muted-foreground tabular-nums group-hover:text-ink">{formattedDate}</time>
                  <TermMark date={date} className="hidden text-xs md:inline" />
                </span>
                <span className="line-clamp-2 min-w-0 text-foreground transition-colors group-hover:text-ink md:line-clamp-1">
                  {article.title}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
