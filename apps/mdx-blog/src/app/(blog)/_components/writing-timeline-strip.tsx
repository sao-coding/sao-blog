'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import type { InferClientOutputs } from '@orpc/client'
import type { client } from '@/lib/orpc'

type HomeData = InferClientOutputs<typeof client>['home']['getHome']['data']

interface WritingTimelineStripProps {
  thisYear: HomeData['thisYear']
  latestTitle: string | null
}

// 季節標記（依日曆年位置）
const SEASONS = [
  { label: '春', fraction: 0.16 },
  { label: '夏', fraction: 0.41 },
  { label: '秋', fraction: 0.66 },
  { label: '冬', fraction: 0.91 },
]

const dayOfYearFraction = (iso: string) => {
  const date = new Date(iso)
  const year = date.getFullYear()
  const start = new Date(year, 0, 1).getTime()
  const totalDays =
    (new Date(year + 1, 0, 1).getTime() - start) / 86_400_000
  const day = (date.getTime() - start) / 86_400_000
  return Math.min(Math.max(day / totalDays, 0), 1)
}

export function WritingTimelineStrip({
  thisYear,
  latestTitle,
}: WritingTimelineStripProps) {
  const [hovered, setHovered] = useState<string | null>(null)

  const now = new Date()
  const nowFraction =
    (now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) /
    (new Date(now.getFullYear() + 1, 0, 1).getTime() -
      new Date(now.getFullYear(), 0, 1).getTime())

  const dots = thisYear.items.map((item) => ({
    ...item,
    fraction: dayOfYearFraction(item.createdAt),
    month: new Date(item.createdAt).getMonth() + 1,
  }))

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

      <div className="relative">
        {/* 主軸線 */}
        <div className="relative h-px w-full bg-neutral-10/15">
          {/* 今日標記 */}
          <span
            className="absolute -top-2 text-[11px] text-rose-400/80"
            style={{ left: `${nowFraction * 100}%`, transform: 'translateX(-50%)' }}
          >
            今
          </span>
          <span
            className="absolute top-[-3px] size-1.5 rounded-full bg-rose-400"
            style={{ left: `${nowFraction * 100}%`, transform: 'translateX(-50%)' }}
          />

          {/* 作品圓點 */}
          {dots.map((dot) => {
            const isLate = dot.fraction > nowFraction - 0.1
            return (
              <Link
                key={dot.id}
                href={dot.href}
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${dot.fraction * 100}%` }}
                onMouseEnter={() => setHovered(dot.id)}
                onMouseLeave={() => setHovered(null)}
              >
                <span
                  className={`block size-2 rounded-full transition-transform hover:scale-150 ${
                    isLate ? 'bg-rose-400/80' : 'bg-neutral-10/40'
                  }`}
                />
                {hovered === dot.id && (
                  <span className="absolute bottom-4 left-1/2 z-10 w-max max-w-[220px] -translate-x-1/2 rounded-md border border-neutral-10/15 bg-stone-900/95 px-2.5 py-1.5 text-xs text-neutral-10/80 shadow-lg">
                    <span className="line-clamp-1">{dot.title}</span>
                    <span className="ml-1 text-neutral-10/40">{dot.month}月</span>
                  </span>
                )}
              </Link>
            )
          })}
        </div>

        {/* 季節標記 */}
        <div className="relative mt-4 h-4">
          {SEASONS.map((season) => (
            <span
              key={season.label}
              className="absolute text-xs text-neutral-10/30"
              style={{
                left: `${season.fraction * 100}%`,
                transform: 'translateX(-50%)',
              }}
            >
              {season.label}
            </span>
          ))}
        </div>
      </div>

      {latestTitle && (
        <p className="mt-12 text-center text-sm text-neutral-10/50">
          近作 · {latestTitle}
        </p>
      )}

      <div className="mt-8 text-center">
        <Link
          href="/timeline"
          className="text-sm italic text-neutral-10/50 transition-colors hover:text-rose-300"
        >
          本年 {thisYear.total} 篇 · 翻閱完整時間線 →
        </Link>
      </div>
    </motion.section>
  )
}
