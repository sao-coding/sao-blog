'use client'

import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import dayjs from 'dayjs'
import type { InferClientOutputs } from '@orpc/client'
import type { client } from '@/lib/orpc'
import { cn } from '@/lib/utils'
import { getLocale } from '#/paraglide/runtime'
import { Button } from '@sao-blog/ui/components/button'
import { m } from '#/paraglide/messages'

type RouterOutputs = InferClientOutputs<typeof client>
export type FriendCircleData = RouterOutputs['friend']['getCircle']['data']
type CircleArticle = FriendCircleData['articles'][number]

const PAGE = 30
/** 篩選列收起時顯示幾位朋友（約兩行） */
const COLLAPSED_AUTHORS = 11

// 朋友圈：上方用頭像篩選朋友，下方依月份分組的文章流。
// 資料來自別人的 feed，只渲染純文字標題與摘要，不放任何 HTML。

function Avatar({ src, name, className }: { src: string; name: string; className?: string }) {
  return src ? (
    <img
      src={src}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      className={cn('shrink-0 rounded-full border border-rule bg-muted object-cover', className)}
    />
  ) : (
    <span className={cn('flex shrink-0 items-center justify-center rounded-full border border-rule bg-muted font-wenkai text-xs', className)}>
      {name.slice(0, 1)}
    </span>
  )
}

/** 依月份分組；沒有日期的放最後 */
function groupByMonth(articles: CircleArticle[]) {
  const groups = new Map<string, CircleArticle[]>()
  for (const a of articles) {
    const key = a.published ? dayjs(a.published).format('YYYY-MM') : ''
    const list = groups.get(key)
    if (list) list.push(a)
    else groups.set(key, [a])
  }
  return [...groups]
}

export function CircleFeed({ data, author }: { data: FriendCircleData; author?: string }) {
  const [shown, setShown] = useState(PAGE)

  // 篩選列只列出有文章的朋友，依文章數排序
  const authors = useMemo(() => {
    const counts = new Map<string, { name: string; avatar: string; count: number }>()
    for (const a of data.articles) {
      const entry = counts.get(a.author)
      if (entry) entry.count++
      else counts.set(a.author, { name: a.author, avatar: a.avatar, count: 1 })
    }
    return [...counts.values()].sort((a, b) => b.count - a.count)
  }, [data.articles])

  const [expanded, setExpanded] = useState(false)
  const visibleAuthors = expanded
    ? authors
    : authors.filter((a, i) => i < COLLAPSED_AUTHORS || a.name === author)

  const filtered = author ? data.articles.filter((a) => a.author === author) : data.articles
  const months = groupByMonth(filtered.slice(0, shown))
  const monthFormat = new Intl.DateTimeFormat(getLocale(), { year: 'numeric', month: 'long' })
  const updated = dayjs(data.generated_at)

  return (
    <div>
      <div className="mb-8 flex flex-col gap-3">
        {/* 換行排列（不用橫向捲動：桌機滑鼠捲不動）；人多時先收起，選中的人一定顯示 */}
        <div className="flex flex-wrap gap-1.5">
          <Link
            to="/fcircle"
            search={{}}
            className={cn(
              'flex shrink-0 items-center rounded-full border px-3 py-1 font-wenkai text-sm transition-colors',
              !author ? 'border-ink/50 bg-ink/10 text-foreground' : 'border-rule text-muted-foreground hover:text-foreground'
            )}
          >
            {m.fcircle_all()}
            <span className="ml-1.5 text-xs tabular-nums">{data.articles.length}</span>
          </Link>
          {visibleAuthors.map((a) => (
            <Link
              key={a.name}
              to="/fcircle"
              search={{ author: a.name }}
              title={a.name}
              className={cn(
                'flex max-w-[12rem] items-center gap-1.5 rounded-full border py-0.5 pr-3 pl-0.5 font-wenkai text-sm transition-colors',
                author === a.name ? 'border-ink/50 bg-ink/10 text-foreground' : 'border-rule text-muted-foreground hover:text-foreground'
              )}
            >
              <Avatar src={a.avatar} name={a.name} className="size-6" />
              <span className="truncate">{a.name}</span>
              <span className="shrink-0 text-xs tabular-nums">{a.count}</span>
            </Link>
          ))}
          {authors.length > COLLAPSED_AUTHORS && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="rounded-full border border-dashed border-rule px-3 py-1 font-wenkai text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {expanded ? m.fcircle_collapse() : m.fcircle_expand({ count: authors.length })}
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {m.fcircle_updated({ time: updated.format('YYYY-MM-DD HH:mm') })}
        </p>
      </div>

      {filtered.length === 0 ? (
        <p className="my-16 text-center font-wenkai text-muted-foreground">{m.fcircle_empty()}</p>
      ) : (
        <div className="space-y-10">
          {months.map(([month, items]) => (
            <section key={month || 'undated'}>
              <h2 className="mb-2 font-wenkai text-sm text-ink/70">
                {month ? monthFormat.format(dayjs(`${month}-01`).toDate()) : '—'}
              </h2>
              <ol className="divide-y divide-dashed divide-rule border-t border-dashed border-rule">
                {items.map((a) => (
                  <li key={a.link}>
                    <a
                      href={a.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group grid grid-cols-[2.75rem_1fr] gap-x-3 py-4 sm:grid-cols-[3.25rem_1fr]"
                    >
                      <time
                        dateTime={a.published ?? undefined}
                        className="pt-0.5 font-mono text-xs text-muted-foreground tabular-nums"
                      >
                        {a.published ? dayjs(a.published).format('MM-DD') : ''}
                      </time>
                      <div className="min-w-0">
                        <p className="font-wenkai text-base leading-snug text-foreground transition-colors group-hover:text-ink">
                          {a.title}
                        </p>
                        {a.summary && (
                          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{a.summary}</p>
                        )}
                        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Avatar src={a.avatar} name={a.author} className="size-4" />
                          {a.author}
                        </p>
                      </div>
                    </a>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}

      {shown < filtered.length && (
        <div className="mt-8 text-center">
          <Button variant="ghost" onClick={() => setShown((n) => n + PAGE)}>
            {m.fcircle_more()}
          </Button>
        </div>
      )}
    </div>
  )
}
