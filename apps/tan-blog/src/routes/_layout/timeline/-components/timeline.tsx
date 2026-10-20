import { TimelineSchema } from '@sao-blog/api/schema/timeline'
import { motion } from 'motion/react'
import { Link } from '@tanstack/react-router'
import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import type { MouseEvent } from 'react'
import type z from 'zod'

import { openArticlePreview } from '@/components/preview/preview-url'
import { MONTH_NAMES, TermMark } from '@/components/written-season'

const EASE = [0.25, 0.1, 0.25, 1] as const

type Article = z.infer<typeof TimelineSchema>['items'][number]

interface MonthGroup {
  month: number
  startIndex: number
  items: Article[]
}

interface TimelineProps {
  year: number
  count: number
  groupIndex?: number
  articles: Article[]
}

function groupByMonth(articles: Article[]): MonthGroup[] {
  const groups: MonthGroup[] = []
  let globalIdx = 0

  for (const article of articles) {
    const month = new Date(article.createdAt).getMonth()
    const last = groups.at(-1)

    if (last?.month === month) {
      last.items.push(article)
    } else {
      groups.push({ month, startIndex: globalIdx, items: [article] })
    }

    globalIdx++
  }

  return groups
}

export function Timeline({ year, count, groupIndex = 0, articles }: TimelineProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const itemRefs = useRef<(HTMLLIElement | null)[]>([])
  const yearDelay = groupIndex * 0.04

  const grouped = useMemo(() => groupByMonth(articles), [articles])

  const handlePreviewClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>, goTo: string) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return
      }
      e.preventDefault()
      openArticlePreview(goTo)
    },
    []
  )

  const updateIndicator = useCallback((index: number | null) => {
    const list = listRef.current
    if (!list) return

    if (index === null) {
      list.style.setProperty('--indicator-opacity', '0')
      return
    }

    const item = itemRefs.current[index]
    if (!item) return

    const { top: iTop, height } = item.getBoundingClientRect()
    const { top: lTop } = list.getBoundingClientRect()

    list.style.setProperty('--indicator-top', `${iTop - lTop}px`)
    list.style.setProperty('--indicator-height', `${height}px`)
    list.style.setProperty('--indicator-opacity', '1')
  }, [])

  useEffect(() => {
    updateIndicator(hoveredIndex)
    if (hoveredIndex === null) return

    const sync = () => updateIndicator(hoveredIndex)
    window.addEventListener('scroll', sync, { passive: true })
    window.addEventListener('resize', sync)
    return () => {
      window.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
    }
  }, [hoveredIndex, updateIndicator])

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: 12, filter: 'blur(5px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.48, delay: yearDelay, ease: EASE }}
        className="mb-4 flex items-baseline gap-3 pl-6"
      >
        <h2 className="font-wenkai text-5xl leading-none text-ink/25 tabular-nums select-none">
          <time dateTime={String(year)}>{year}</time>
        </h2>
        <span className="font-wenkai text-sm text-muted-foreground">
          <span className="sr-only">共有</span>
          {count} 篇文章
        </span>
      </motion.header>

      <motion.ul
        ref={listRef}
        className="relative timeline-indicator sao-timeline"
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
        {grouped.map(({ month, startIndex, items }) => (
          <div key={month}>
            <motion.div
              className="flex items-center gap-3 px-7 py-2"
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { duration: 0.3 } },
              }}
            >
              <span className="shrink-0 font-wenkai text-sm text-muted-foreground">
                {MONTH_NAMES[month]}
              </span>
              <span className="flex-1 border-t border-dashed border-rule" />
            </motion.div>

            {items.map((article, i) => {
              const idx = startIndex + i
              const date = new Date(article.createdAt)
              const day = String(date.getDate()).padStart(2, '0')
              const to = article.type === 'note' ? '/notes/$id' : '/posts/$slug'
              const goTo =
                article.type === 'note' ? `notes/${article.slug}` : `posts/${article.slug}`

              return (
                <motion.li
                  key={article.id}
                  ref={(el) => {
                    itemRefs.current[idx] = el
                  }}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  className="group py-3 px-7"
                  variants={{
                    hidden: { opacity: 0, y: 8, filter: 'blur(3px)' },
                    show: {
                      opacity: 1,
                      y: 0,
                      filter: 'blur(0px)',
                      transition: { duration: 0.36, ease: EASE },
                    },
                  }}
                >
                  <Link
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    to={to as any}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    params={
                      (article.type === 'note'
                        ? { id: article.slug }
                        : { slug: article.slug }) as any
                    }
                    onClick={(e) => handlePreviewClick(e, goTo)}
                    className="flex items-baseline gap-3 transition-colors md:gap-6"
                  >
                    <span className="flex w-8 shrink-0 items-baseline gap-2 font-wenkai text-sm md:w-24">
                      <time className="text-muted-foreground tabular-nums group-hover:text-ink">{day}</time>
                      <TermMark date={date} className="hidden text-xs md:inline" />
                    </span>
                    {/* 手機版允許換行（最多兩行），寬螢幕才截成一行 */}
                    <span className="line-clamp-2 min-w-0 font-wenkai text-foreground transition-colors group-hover:text-ink md:line-clamp-1">
                      {article.title}
                    </span>
                    <span className="ml-auto hidden shrink-0 font-wenkai text-xs text-muted-foreground md:inline">
                      {article.category && <>{article.category} / 文章</>}
                      {article.type === 'note' && (
                        <>心情: {article.mood} / 天氣: {article.weather} / 筆記</>
                      )}
                    </span>
                  </Link>
                </motion.li>
              )
            })}
          </div>
        ))}
      </motion.ul>
    </>
  )
}
