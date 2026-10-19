import dayjs from 'dayjs'
import { getSolarTerm } from '@/lib/season'
import { TERM_THEMES } from '@/lib/term-themes'
import { cn } from '@/lib/utils'
import { m } from '#/paraglide/messages'

// 「寫作當時的季節」：文章與日記標上寫下它那天的節氣，而不是現在的季節。

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
