import { getSolarTerm } from '@/lib/season'
import { cn } from '@/lib/utils'
import { m } from '#/paraglide/messages'
import { siteTime } from '@/lib/site-time'

// 「寫作當時的季節」：文章與日記標上寫下它那天的節氣，而不是現在的季節。
// 節氣名是字，跟日期同一階墨（--ink-3）；節氣色只給墨暈用（DESIGN.md 第 1 節），不進這裡。

// 「寫於 2026-10-08・寒露」。日期用站點時區：伺服器（UTC）與讀者瀏覽器時區不同時，SSR 與 hydration 才會是同一天
export function WrittenOn({ date, className }: { date: Date | string; className?: string }) {
  const term = getSolarTerm(new Date(date))
  return (
    <span className={cn('inline-flex items-baseline gap-1.5 font-display text-sm text-ink-3', className)}>
      {m.written_on({ date: siteTime(date).format('YYYY-MM-DD') })}
      <span>{term.term}</span>
    </span>
  )
}

// 列表用的節氣小字
export function TermMark({ date, className }: { date: Date | string; className?: string }) {
  const term = getSolarTerm(new Date(date))
  return <span className={cn('font-display text-ink-3', className)}>{term.term}</span>
}
