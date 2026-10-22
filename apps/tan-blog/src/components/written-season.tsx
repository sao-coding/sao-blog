import { getSolarTerm } from '@/lib/season'
import { TERM_THEMES } from '@/lib/term-themes'
import { cn } from '@/lib/utils'
import { m } from '#/paraglide/messages'
import { siteTime } from '@/lib/site-time'

// 「寫作當時的季節」：文章與日記標上寫下它那天的節氣，而不是現在的季節。

// 節氣色是為深色底調的（有些很淺，例如立夏的油桐白），和目前文字色混合，晝／夜都看得清楚
const termColor = (index: number) => `color-mix(in oklch, ${TERM_THEMES[index].accent} 60%, var(--foreground))`

// 「寫於 2026-10-08・寒露」。日期用站點時區：伺服器（UTC）與讀者瀏覽器時區不同時，SSR 與 hydration 才會是同一天
export function WrittenOn({ date, className }: { date: Date | string; className?: string }) {
  const term = getSolarTerm(new Date(date))
  return (
    <span className={cn('inline-flex items-baseline gap-1.5 font-wenkai text-sm text-muted-foreground', className)}>
      {m.written_on({ date: siteTime(date).format('YYYY-MM-DD') })}
      <span style={{ color: termColor(term.index) }}>{term.term}</span>
    </span>
  )
}

// 時間線月份標題：數字月份＋傳統月名，和信箋的落款一個調子
export const MONTH_NAMES = [
  '一月 · 正月', '二月 · 杏月', '三月 · 桃月', '四月 · 槐月', '五月 · 榴月', '六月 · 荷月',
  '七月 · 蘭月', '八月 · 桂月', '九月 · 菊月', '十月 · 陽月', '十一月 · 葭月', '十二月 · 臘月',
] as const

// 列表用的節氣小字
export function TermMark({ date, className }: { date: Date | string; className?: string }) {
  const term = getSolarTerm(new Date(date))
  return (
    <span className={cn('font-wenkai', className)} style={{ color: termColor(term.index) }}>
      {term.term}
    </span>
  )
}
