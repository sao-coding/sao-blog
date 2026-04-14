"use client"
import { TimelineSchema } from "@sao-blog/api/schema/timeline"
// categories-timeline.tsx
import { motion } from "motion/react"
import Link from "next/link"
import { useState, useRef, useEffect } from "react"
import z from "zod"


interface TimelineProps {
  year: number
  count: number
  groupIndex?: number
  articles: z.infer<typeof TimelineSchema>['items']
}
    
export function Timeline({ year, count, groupIndex = 0, articles }: TimelineProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [indicatorStyle, setIndicatorStyle] = useState({ top: 0, height: 0 })
  const listRef = useRef<HTMLUListElement>(null)
  const itemRefs = useRef<(HTMLLIElement | null)[]>([])
  const yearDelay = groupIndex * 0.04

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
      <motion.header
        initial={{ opacity: 0, y: 12, filter: "blur(5px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.48, delay: yearDelay, ease: [0.25, 0.1, 0.25, 1] }}
        className="mb-4 flex items-baseline gap-3 pl-6"
      >
        <h2 className="text-5xl leading-none font-extralight tracking-tighter text-transparent [-webkit-text-stroke:1px_rgba(115,115,115,0.8)]">
          <time dateTime={`${year}`}>
            {year}
          </time>
        </h2>
        <span className="text-sm text-muted-foreground">
          <span className="sr-only">共有</span>
          {count} 篇文章
        </span>
      </motion.header>

      {/* 滑動高亮指示器 */}
      <div
        className="absolute left-0 w-[2px] bg-primary transition-all duration-300 ease-out"
        style={{
          top: indicatorStyle.top,
          height: indicatorStyle.height,
          opacity: hoveredIndex !== null ? 1 : 0,
        }}
      />

      <motion.ul
        ref={listRef}
        className="relative"
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: {
            transition: {
              delayChildren: yearDelay + 0.12,
              staggerChildren: 0.06,
            },
          },
        }}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {articles.map((article, index) => {
          const date = new Date(article.createdAt)
          const formattedDate = `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
          
          return (
            <motion.li
              key={article.id}
              ref={(el) => { itemRefs.current[index] = el }}
              onMouseEnter={() => setHoveredIndex(index)}
              className="group"
              variants={{
                hidden: { opacity: 0, y: 8, filter: "blur(3px)" },
                show: {
                  opacity: 1,
                  y: 0,
                  filter: "blur(0px)",
                  transition: { duration: 0.36, ease: [0.25, 0.1, 0.25, 1] },
                },
              }}
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
                {
                    article.category && (
                        <span className="ml-auto text-sm text-muted-foreground">
                            {article.category} / 文章
                        </span>
                    )
                }
                {
                    article.type === 'note' && (
                        <span className="ml-auto text-sm text-muted-foreground">
                            心情: {article.mood} / 天氣: {article.weather} / 筆記
                        </span>
                    )
                }
              </Link>
            </motion.li>
          )
        })}
      </motion.ul>
    </div>
  )
}
