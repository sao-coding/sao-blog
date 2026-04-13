"use client"
import { TimelineSchema } from "@sao-blog/api/schema/timeline"
// categories-timeline.tsx
import Link from "next/link"
import { useState, useRef, useEffect } from "react"
import z from "zod"


interface TimelineProps {
  articles: z.infer<typeof TimelineSchema>['items']
}
    
export function Timeline({ articles }: TimelineProps) {
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
    <div className="relative -ml-6">
      {/* 滑動高亮指示器 */}
      <div
        className="absolute left-0 w-[2px] bg-primary transition-all duration-300 ease-out"
        style={{
          top: indicatorStyle.top,
          height: indicatorStyle.height,
          opacity: hoveredIndex !== null ? 1 : 0,
        }}
      />

      <ul
        ref={listRef}
        className="relative"
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {articles.map((article, index) => {
          const date = new Date(article.createdAt)
          const formattedDate = `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
          
          return (
            <li
              key={article.id}
              ref={(el) => { itemRefs.current[index] = el }}
              onMouseEnter={() => setHoveredIndex(index)}
              className="group"
            >
              <Link
                href={`/posts/${article.slug}`}
                className="flex items-baseline gap-6 py-3 pl-6 transition-colors"
              >
                <time className="text-sm text-muted-foreground tabular-nums shrink-0 w-24">
                  {formattedDate}
                </time>
                <span className="text-foreground group-hover:text-primary transition-colors">
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
