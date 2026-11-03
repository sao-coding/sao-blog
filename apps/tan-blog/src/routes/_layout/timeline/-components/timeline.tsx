import { TimelineSchema } from '@sao-blog/api/schema/timeline'
import { Link } from '@tanstack/react-router'
import { useMemo } from 'react'
import type z from 'zod'

import { m } from '#/paraglide/messages'
import { TermMark } from '@/components/written-season'
import { GroupMark, oldProps } from '@/components/layout/list-parts'
import { siteTime } from '@/lib/site-time'
import { anchorProps } from '@/lib/page-transition'
import { BrushDot, BrushLine, termOrdinal } from './brush-line'

type Article = z.infer<typeof TimelineSchema>['items'][number]

interface MonthGroup {
  month: number
  label: string
  items: Article[]
}

interface TimelineProps {
  year: number
  count: number
  articles: Article[]
}

function groupByMonth(articles: Article[]): MonthGroup[] {
  const groups: MonthGroup[] = []
  for (const article of articles) {
    const date = siteTime(article.createdAt)
    const month = date.month()
    const last = groups.at(-1)
    if (last?.month === month) last.items.push(article)
    else groups.push({ month, label: date.format('MMMM'), items: [article] })
  }
  return groups
}

// 一年一段：年份大字（淡墨），每個月一行小字，底下一列一篇（日、標題、分類或日記的天氣心情）。
// 左邊是一筆寫到乾的線、每篇一個「、」（brush-line.tsx）；節氣名只在換了節氣的那一列寫。
// 進場（年份、月份、各列）由 _layout 換頁時統一排（lib/page-enter.ts 的 data-enter）
export function Timeline({ year, count, articles }: TimelineProps) {
  const grouped = useMemo(() => groupByMonth(articles), [articles])
  // 這一列是不是這個節氣的第一列（新→舊，所以是畫面上的第一列）
  const termStart = useMemo(() => {
    const starts = new Set<string>()
    let prev: number | null = null
    for (const a of articles) {
      const t = termOrdinal(a.createdAt)
      if (t !== prev) starts.add(a.id)
      prev = t
    }
    return starts
  }, [articles])

  return (
    <>
      <GroupMark big={<time dateTime={String(year)}>{year}</time>} small={m.posts_year_count({ count: String(count) })} />

      <BrushLine year={year} entries={articles}>
      {grouped.map(({ month, label, items }) => (
        <div key={month} className="mt-6 first-of-type:mt-4">
          <h3 data-enter className="mb-1 font-display text-sm text-ink-3">
            {label}
          </h3>
          <ul>
            {items.map((article) => {
              const isNote = article.type === 'note'
              const href = isNote ? `/notes/${article.slug}` : `/posts/${article.slug}`
              const aside = isNote ? [article.weather, article.mood].filter(Boolean).join(' · ') : article.category
              return (
                <li key={article.id} data-enter className="ink-row relative" {...oldProps(article.createdAt)}>
                  <span data-tl-dot className="absolute top-[0.7rem] -left-8 flex w-8 justify-center sm:-left-10 sm:w-10">
                    <BrushDot seed={article.id} size={isNote ? 11 : 15} />
                  </span>
                  <Link
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    to={(isNote ? '/notes/$id' : '/posts/$slug') as any}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    params={(isNote ? { id: article.slug } : { slug: article.slug }) as any}
                    className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-baseline gap-x-4 py-2.5 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto] sm:gap-x-6"
                  >
                    <span className="flex items-baseline gap-2 text-sm text-ink-3 tabular-nums">
                      <time dateTime={siteTime(article.createdAt).toISOString()}>{siteTime(article.createdAt).format('DD')}</time>
                      {termStart.has(article.id) && <TermMark date={article.createdAt} className="hidden text-xs sm:inline" />}
                    </span>
                    {/* 手機版允許換行（最多兩行），寬螢幕才截成一行 */}
                    <span className="ink-title line-clamp-2 min-w-0 font-display sm:line-clamp-1" {...anchorProps(href)}>
                      {article.title}
                    </span>
                    <span className="col-start-2 font-display text-xs text-ink-3 sm:col-start-auto sm:text-sm">
                      {aside && <>{aside} · </>}
                      {isNote ? m.page_notes_title() : m.page_posts_title()}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
      </BrushLine>
    </>
  )
}
