'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import dayjs from 'dayjs'
import type { InferClientOutputs } from '@orpc/client'
import type { client } from '@/lib/orpc'
import { getLocale } from '#/paraglide/runtime'
import { m } from '#/paraglide/messages'
import { FriendAvatar } from '../../friends/-components/friend-list'
import { brush, through } from '../../friends/-components/yousi'

type RouterOutputs = InferClientOutputs<typeof client>
export type FriendCircleData = RouterOutputs['friend']['getCircle']['data']
type CircleArticle = FriendCircleData['articles'][number]

const PAGE = 30

// 朋友圈（友鏈的子頁，2026-11-03 站主照概念圖定的，甲「漣漪」＋游絲）：
// 左邊一筆直直垂下的細墨（跟友鏈同一套 yousi.ts），每一篇在線上落一滴墨、泛幾圈扁扁的漣漪——
// 寫得越近圈越多（三天內四圈、兩週內三圈、其他兩圈），最新的那一滴是朱。
// 右邊一列：朋友的圓頭像、名字、文章標題（點了去那篇），最右邊「幾小時前」。列之間一條髮絲線。
// 篩選是一個下拉選單（朋友再多都不佔版面）。資料來自別人的 feed，只渲染純文字。

/** 離現在多久 → 幾圈漣漪 */
function ripplesFor(published: string | null | undefined) {
  if (!published) return 2
  const days = dayjs().diff(dayjs(published), 'day', true)
  return days <= 3 ? 4 : days <= 14 ? 3 : 2
}

/** 「2 小時前」「3 天前」；一個月以上寫日期 */
function ago(published: string | null | undefined) {
  if (!published) return ''
  const d = dayjs(published)
  const rtf = new Intl.RelativeTimeFormat(getLocale(), { numeric: 'auto' })
  const mins = dayjs().diff(d, 'minute')
  if (mins < 60) return rtf.format(-Math.max(1, mins), 'minute')
  if (mins < 60 * 24) return rtf.format(-Math.floor(mins / 60), 'hour')
  if (mins < 60 * 24 * 30) return rtf.format(-Math.floor(mins / 60 / 24), 'day')
  return d.year() === dayjs().year() ? d.format('MM-DD') : d.format('YYYY-MM-DD')
}

/** 線上的一滴墨與漣漪（水面看過去是扁的） */
function Drop({ rings, zhu }: { rings: number; zhu: boolean }) {
  const color = zhu ? 'var(--zhu)' : 'var(--ink-4)'
  return (
    <svg aria-hidden viewBox="-18 -7 36 14" className="circle-drop pointer-events-none relative w-16 overflow-visible sm:w-20" data-zhu={zhu}>
      {Array.from({ length: rings }, (_, i) => (
        <ellipse key={i} rx={5.5 + i * 4} ry={(5.5 + i * 4) * 0.36} fill="none" stroke={color} strokeWidth={0.9 - i * 0.15} strokeOpacity={1 - i * 0.2} />
      ))}
      <ellipse rx="1.9" ry="1.4" fill="var(--ink-1)" />
    </svg>
  )
}

export function CircleFeed({ data, author }: { data: FriendCircleData; author?: string }) {
  const [shown, setShown] = useState(PAGE)
  const navigate = useNavigate()

  // 下拉選單只列有文章的朋友，依文章數排序
  const authors = useMemo(() => {
    const counts = new Map<string, number>()
    for (const a of data.articles) counts.set(a.author, (counts.get(a.author) ?? 0) + 1)
    return [...counts].sort((a, b) => b[1] - a[1])
  }, [data.articles])

  const filtered = author ? data.articles.filter((a) => a.author === author) : data.articles
  const items = filtered.slice(0, shown)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <p className="font-display text-sm text-ink-3 tabular-nums">{m.fcircle_count({ count: String(filtered.length) })}</p>
        <label className="relative">
          <span className="sr-only">{m.fcircle_filter()}</span>
          <select
            value={author ?? ''}
            onChange={(e) => navigate({ to: '/fcircle', search: e.target.value ? { author: e.target.value } : {} })}
            className="circle-select max-w-[14rem] cursor-pointer appearance-none truncate rounded-full border border-ink-5 bg-transparent py-1.5 pr-8 pl-4 font-display text-sm text-ink-1"
          >
            <option value="">{m.fcircle_all_friends()}</option>
            {authors.map(([name, count]) => (
              <option key={name} value={name}>
                {name}（{count}）
              </option>
            ))}
          </select>
          <span aria-hidden className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-xs text-ink-3">
            ▾
          </span>
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="my-16 text-center font-display text-ink-3">{m.fcircle_empty()}</p>
      ) : (
        <Timeline items={items} />
      )}

      {shown < filtered.length && (
        <div className="mt-8 pl-[4.75rem] sm:pl-[6.75rem]">
          <button
            type="button"
            onClick={() => setShown((n) => n + PAGE)}
            className="cursor-pointer font-display text-ink-2 underline decoration-zhu decoration-1 underline-offset-[6px] transition-colors hover:text-zhu"
          >
            {m.fcircle_more()} ↓
          </button>
        </div>
      )}
    </div>
  )
}

function Timeline({ items }: { items: CircleArticle[] }) {
  const list = useRef<HTMLOListElement>(null)
  const [line, setLine] = useState<string | null>(null)

  // 量每一滴墨的中心，一筆垂直的細墨穿過去（上面起筆、下面拖一小段收筆）
  useEffect(() => {
    const el = list.current
    if (!el) return
    let frame = 0
    const draw = () => {
      const o = el.getBoundingClientRect()
      const pts = [...el.querySelectorAll('.circle-drop')].map((d, i) => {
        const r = d.getBoundingClientRect()
        // 每段中間往左右飄一點，像手拉下來的線
        return { x: r.left + r.width / 2 - o.left + (i % 2 ? 1.5 : -1.5), y: r.top + r.height / 2 - o.top }
      })
      if (pts.length === 0) return setLine(null)
      const top = { x: pts[0].x, y: pts[0].y - 34 }
      const end = { x: pts.at(-1)!.x + 1, y: pts.at(-1)!.y + 40 }
      setLine(brush(through([top, ...pts, end]), 'fcircle').ink)
    }
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(draw)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    document.fonts?.ready.then(update)
    return () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
    }
  }, [items])

  return (
    <div className="relative">
      <svg aria-hidden className="pointer-events-none absolute inset-0 size-full overflow-visible text-ink-1">
        {line && <path d={line} fill="currentColor" fillOpacity={0.8} />}
      </svg>
      <ol ref={list} className="relative">
        {items.map((a, i) => (
          <li
            key={a.link}
            data-enter
            className="circle-row group relative grid grid-cols-[4rem_3rem_minmax(0,1fr)] items-center gap-x-3 py-5 sm:grid-cols-[5.5rem_3.5rem_minmax(0,1fr)_auto] sm:gap-x-5"
          >
            <span className="grid place-items-center">
              <Drop rings={ripplesFor(a.published)} zhu={i === 0} />
            </span>
            <FriendAvatar name={a.author} src={a.avatar} className="size-12 text-lg sm:size-14 sm:text-xl" />
            <div className="min-w-0 border-ink-5">
              <p className="font-display text-lg leading-snug text-ink-1">{a.author}</p>
              <a
                href={a.link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 line-clamp-2 leading-snug text-ink-2 transition-colors after:absolute after:inset-0 after:content-[''] group-hover:text-zhu"
              >
                《{a.title}》
              </a>
              {/* 窄版：時間寫在標題下面 */}
              <time dateTime={a.published ?? undefined} className="mt-1 block text-xs text-ink-3 tabular-nums sm:hidden">
                {ago(a.published)}
              </time>
            </div>
            <time dateTime={a.published ?? undefined} className="hidden self-start pt-0.5 text-sm text-ink-3 tabular-nums sm:block">
              {ago(a.published)}
            </time>
            {/* 列之間的髮絲線：從頭像那一欄開始，不壓到墨線 */}
            {i > 0 && <span aria-hidden className="absolute top-0 right-0 left-[calc(4rem+0.75rem)] h-px bg-ink-5 sm:left-[calc(5.5rem+1.25rem)]" />}
          </li>
        ))}
      </ol>
    </div>
  )
}
