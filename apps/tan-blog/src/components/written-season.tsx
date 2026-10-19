import type { CSSProperties } from 'react'
import dayjs from 'dayjs'
import { SeasonParticles } from '@/components/season-particles'
import { getSolarTerm } from '@/lib/season'
import { TERM_THEMES, weatherTheme } from '@/lib/term-themes'
import { cn } from '@/lib/utils'
import { m } from '#/paraglide/messages'

// 「寫作當時的季節」：文章與日記不跟著現在的季節，而是帶著寫下它那天的節氣。
// 打開一篇冬天寫的文章，頁首就是細雪；日記有填天氣（晴、雨、雪）時改用天氣。

// 頁首的季節帶：放在 position: relative 的頁面外層裡，鋪在內容後面、往下淡出
export function SeasonBand({ date, weather }: { date: Date | string; weather?: string | null }) {
  const term = getSolarTerm(new Date(date))
  const theme = weatherTheme(weather) ?? TERM_THEMES[term.index]

  return (
    <div
      aria-hidden
      style={{ '--season': theme.accent } as CSSProperties}
      className="pointer-events-none absolute inset-x-0 -top-[4.5rem] -z-10 h-[26rem] overflow-hidden [mask-image:linear-gradient(to_bottom,#000_55%,transparent)]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_0%,color-mix(in_oklch,var(--season)_20%,transparent),transparent_70%)]" />
      <SeasonParticles mix={theme.mix} density={0.9} />
    </div>
  )
}

// 「寫於 2026-10-08・寒露」
export function WrittenOn({ date, className }: { date: Date | string; className?: string }) {
  const term = getSolarTerm(new Date(date))
  return (
    <span className={cn('inline-flex items-baseline gap-1.5 font-wenkai text-sm text-muted-foreground', className)}>
      {m.written_on({ date: dayjs(date).format('YYYY-MM-DD') })}
      <span style={{ color: TERM_THEMES[term.index].accent }}>{term.term}</span>
    </span>
  )
}

// 列表用的節氣小字
export function TermMark({ date, className }: { date: Date | string; className?: string }) {
  const term = getSolarTerm(new Date(date))
  return (
    <span className={cn('font-wenkai', className)} style={{ color: TERM_THEMES[term.index].accent }}>
      {term.term}
    </span>
  )
}
