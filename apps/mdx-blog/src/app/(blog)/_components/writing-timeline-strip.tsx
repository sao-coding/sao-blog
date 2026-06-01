'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import type { InferClientOutputs } from '@orpc/client'
import type { client } from '@/lib/orpc'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'

type HomeData = InferClientOutputs<typeof client>['home']['getHome']['data']
type TimelineData = HomeData['timeline']
type TimelineItem = TimelineData['items'][number]

interface WritingTimelineStripProps {
  timeline: TimelineData
}

const DAY_MS = 86_400_000
// 鄰近作品在「五天內」的歸為同一個點
const MERGE_DAYS = 5
// 最近約 90 天以主題色強調
const ACCENT_DAYS = 90

const SEASON_CYCLE = ['春', '夏', '秋', '冬'] as const

const seasonIndexOfMonth = (month: number) => {
  if (month >= 2 && month <= 4) return 0 // 春 3-5
  if (month >= 5 && month <= 7) return 1 // 夏 6-8
  if (month >= 8 && month <= 10) return 2 // 秋 9-11
  return 3 // 冬 12,1,2
}

// 取得某日期所屬的季節（含跨年的冬季起始年）
const seasonOf = (date: Date) => {
  const m = date.getMonth()
  const y = date.getFullYear()
  const idx = seasonIndexOfMonth(m)
  const startYear = idx === 3 ? (m === 11 ? y : y - 1) : y
  return { idx, label: SEASON_CYCLE[idx], startYear }
}

// 季節的起訖（用於迷你軸線定位）
const seasonSpan = (idx: number, startYear: number): [number, number] => {
  switch (idx) {
    case 0:
      return [+new Date(startYear, 2, 1), +new Date(startYear, 5, 1)]
    case 1:
      return [+new Date(startYear, 5, 1), +new Date(startYear, 8, 1)]
    case 2:
      return [+new Date(startYear, 8, 1), +new Date(startYear, 11, 1)]
    default:
      return [+new Date(startYear, 11, 1), +new Date(startYear + 1, 2, 1)]
  }
}

// 在 [start, end] 區間內，於各季節中點放置季節標記
const buildSeasonMarkers = (startMs: number, endMs: number) => {
  const span = Math.max(endMs - startMs, 1)
  const current = seasonOf(new Date(endMs))
  const mids = [
    { idx: 0, label: '春', m: 3, d: 15 },
    { idx: 1, label: '夏', m: 6, d: 15 },
    { idx: 2, label: '秋', m: 9, d: 15 },
    { idx: 3, label: '冬', m: 0, d: 15 },
  ]
  const startYear = new Date(startMs).getFullYear()
  const endYear = new Date(endMs).getFullYear()
  const markers: {
    key: string
    label: string
    fraction: number
    accent: boolean
  }[] = []
  for (let y = startYear - 1; y <= endYear + 1; y++) {
    for (const s of mids) {
      const t = +new Date(y, s.m, s.d)
      if (t < startMs || t > endMs) continue
      const seasonStartYear = s.idx === 3 ? y - 1 : y
      markers.push({
        key: `${y}-${s.idx}`,
        label: s.label,
        fraction: (t - startMs) / span,
        accent: s.idx === current.idx && seasonStartYear === current.startYear,
      })
    }
  }
  return markers
}

interface Cluster {
  key: string
  fraction: number
  items: TimelineItem[]
}

interface SeasonGroup {
  key: string
  label: string
  yearLabel: string
  accent: boolean
  sortKey: number
  items: (TimelineItem & { fraction: number })[]
}

export function WritingTimelineStrip({ timeline }: WritingTimelineStripProps) {
  const start = new Date(timeline.windowStart).getTime()
  const end = new Date(timeline.windowEnd).getTime()
  const span = Math.max(end - start, 1)

  const accentStart =
    span > ACCENT_DAYS * DAY_MS ? (span - ACCENT_DAYS * DAY_MS) / span : 0

  // 桌面版：把五天內的作品聚成一個點
  const clusters = useMemo<Cluster[]>(() => {
    const sorted = [...timeline.items].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
    const grouped: { anchor: number; items: TimelineItem[] }[] = []
    for (const item of sorted) {
      const t = new Date(item.createdAt).getTime()
      const last = grouped.at(-1)
      if (last && t - last.anchor <= MERGE_DAYS * DAY_MS) {
        last.items.push(item)
      } else {
        grouped.push({ anchor: t, items: [item] })
      }
    }
    return grouped.map((cluster) => {
      const avg =
        cluster.items.reduce(
          (sum, i) => sum + new Date(i.createdAt).getTime(),
          0
        ) / cluster.items.length
      return {
        key: cluster.items[0]!.id,
        fraction: Math.min(Math.max((avg - start) / span, 0), 1),
        items: cluster.items,
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline.items, start, span])

  const seasonMarkers = useMemo(
    () => buildSeasonMarkers(start, end),
    [start, end]
  )

  // 手機版：依季節分組
  const seasonGroups = useMemo<SeasonGroup[]>(() => {
    const current = seasonOf(new Date(timeline.windowEnd))
    const map = new Map<string, SeasonGroup>()
    for (const item of timeline.items) {
      const date = new Date(item.createdAt)
      const { idx, label, startYear } = seasonOf(date)
      const key = `${startYear}-${idx}`
      const [seasonStart, seasonEnd] = seasonSpan(idx, startYear)
      const fraction = Math.min(
        Math.max((date.getTime() - seasonStart) / (seasonEnd - seasonStart), 0),
        1
      )
      let group = map.get(key)
      if (!group) {
        group = {
          key,
          label,
          yearLabel:
            idx === 3
              ? `${startYear}–${String(startYear + 1).slice(2)}`
              : String(startYear),
          accent: idx === current.idx && startYear === current.startYear,
          sortKey: startYear * 4 + idx,
          items: [],
        }
        map.set(key, group)
      }
      group.items.push({ ...item, fraction })
    }
    return Array.from(map.values())
      .map((group) => ({
        ...group,
        items: group.items.sort((a, b) => a.fraction - b.fraction),
      }))
      .sort((a, b) => a.sortKey - b.sortKey)
  }, [timeline.items, timeline.windowEnd])

  const monthOf = (iso: string) => new Date(iso).getMonth() + 1

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6 }}
      className="mx-auto mt-32 max-w-5xl px-5"
    >
      <h2 className="mb-16 text-center text-3xl font-light tracking-[0.2em] text-neutral-10/80">
        筆耕不輟
      </h2>

      {/* 桌面版：完整時間軸 */}
      <div className="hidden lg:block">
        <div className="relative h-8">
          {/* 主軸線 */}
          <div className="absolute inset-0 flex items-center">
            <div className="h-px w-full bg-neutral-100/15" />
          </div>

          {/* 最近一季的主題色強調段 */}
          <div
            className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary/15"
            style={{ left: `${accentStart * 100}%`, right: 0 }}
          />

          {/* 作品圓點 */}
          <div className="absolute inset-0">
            {clusters.map((cluster) => {
              const isRecent = cluster.fraction >= accentStart
              const big = cluster.items.length > 1
              return (
                <HoverCard key={cluster.key}>
                  <HoverCardTrigger
                    render={
                      <button
                        type="button"
                        aria-label={cluster.items
                          .map((i) => i.title)
                          .join('、')}
                        className="group/dot absolute top-1/2 -translate-x-1/2 -translate-y-1/2 p-2"
                        style={{ left: `${cluster.fraction * 100}%` }}
                      >
                        <span
                          className={`block rounded-full transition-transform duration-200 group-hover/dot:scale-150 ${
                            big ? 'size-2' : 'size-1.5'
                          } ${isRecent ? 'bg-primary/70' : 'bg-neutral-100/40'}`}
                        />
                      </button>
                    }
                  />
                  <HoverCardContent
                    side="top"
                    sideOffset={8}
                    className="w-max max-w-xs p-2"
                  >
                    <ul className="space-y-0.5">
                      {cluster.items.map((item) => (
                        <li key={item.id}>
                          <Link
                            href={item.href}
                            className="flex items-baseline gap-2 rounded px-2 py-1 text-xs transition-colors hover:bg-primary/10 hover:text-primary"
                          >
                            <span className="line-clamp-1 flex-1">
                              {item.title}
                            </span>
                            <span className="text-muted-foreground shrink-0">
                              {monthOf(item.createdAt)}月
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </HoverCardContent>
                </HoverCard>
              )
            })}
          </div>

          {/* 今日標記 */}
          <div className="absolute top-1/2 right-0 -translate-y-1/2">
            <div className="h-3 w-px bg-primary" />
            <span className="absolute -top-0.5 left-1 text-[11px] text-primary">
              今
            </span>
          </div>
        </div>

        {/* 季節標記 */}
        <div className="relative mt-3 h-4">
          {seasonMarkers.map((season) => (
            <span
              key={season.key}
              className={`absolute -translate-x-1/2 text-xs tracking-[2px] ${
                season.accent ? 'text-primary' : 'text-neutral-10/30'
              }`}
              style={{ left: `${season.fraction * 100}%` }}
            >
              {season.label}
            </span>
          ))}
        </div>

        {timeline.latestTitle && timeline.latestHref && (
          <p className="mt-12 text-center text-sm text-neutral-10/50">
            近作 ·{' '}
            <Link
              href={timeline.latestHref}
              className="text-neutral-10/80 transition-colors hover:text-primary"
            >
              {timeline.latestTitle}
            </Link>
          </p>
        )}
      </div>

      {/* 手機版：依季節分組的迷你軸線 */}
      <div className="flex flex-col gap-10 lg:hidden">
        {seasonGroups.map((group, index) => (
          <motion.div
            key={group.key}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.05 }}
          >
            <div className="flex items-baseline justify-between">
              <span
                className={`font-serif text-base tracking-[2px] ${
                  group.accent ? 'text-primary' : 'text-neutral-100/70'
                }`}
              >
                {group.label}
              </span>
              <span className="text-xs text-neutral-100/40">
                {group.items.length} 篇
              </span>
            </div>

            <div className="relative mt-3 h-3">
              <div className="absolute inset-0 flex items-center">
                <div
                  className={`h-px w-full ${
                    group.accent ? 'bg-primary/40' : 'bg-neutral-100/15'
                  }`}
                />
              </div>
              {group.items.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  aria-label={item.title}
                  className="group/mdot absolute top-1/2 -translate-x-1/2 -translate-y-1/2 p-1.5"
                  style={{ left: `${item.fraction * 100}%` }}
                >
                  <span
                    className={`block size-1.5 rounded-full transition-transform group-hover/mdot:scale-150 ${
                      group.accent ? 'bg-primary/70' : 'bg-neutral-100/40'
                    }`}
                  />
                </Link>
              ))}
              {group.accent && (
                <span className="absolute top-1/2 right-0 h-2.5 w-px -translate-y-1/2 bg-primary" />
              )}
            </div>

            <div className="mt-2 text-[11px] text-neutral-100/40">
              {group.yearLabel}
            </div>

            {group.accent && timeline.latestTitle && timeline.latestHref && (
              <p className="mt-2 text-sm text-neutral-10/60">
                近作 ·{' '}
                <Link
                  href={timeline.latestHref}
                  className="text-neutral-10/80 transition-colors hover:text-primary"
                >
                  {timeline.latestTitle}
                </Link>
              </p>
            )}
          </motion.div>
        ))}
        {seasonGroups.length === 0 && (
          <p className="text-center text-sm text-neutral-10/40">尚無作品</p>
        )}
      </div>

      <div className="mt-8 text-center">
        <Link
          href="/timeline"
          className="text-sm italic text-neutral-10/50 transition-colors hover:text-primary"
        >
          本年 {timeline.yearTotal} 篇 · 翻閱完整時間線 →
        </Link>
      </div>
    </motion.section>
  )
}
