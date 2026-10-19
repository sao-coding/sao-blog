import type { Dayjs } from 'dayjs'

// 撕下來的一頁日曆：上緣虛線是撕痕，上方星期、下方大號日期。
// 桌機 sticky，同一天有多則時捲動中日期會一直留在左側。（/thinking、/notes 共用）
export function CalendarLeaf({ date }: { date: Dayjs }) {
  return (
    <div className="sm:sticky sm:top-24 sm:self-start">
      <time
        dateTime={date.format('YYYY-MM-DD')}
        className="flex flex-col items-center rounded-b-sm border border-t-2 border-rule border-t-ink/40 bg-ink-soft pt-1 pb-1.5 [border-top-style:dashed]"
      >
        <span className="font-wenkai text-xs leading-tight text-muted-foreground sm:text-sm">{date.format('ddd')}</span>
        <span className="font-wenkai text-3xl leading-none text-ink tabular-nums sm:text-4xl">{date.format('D')}</span>
      </time>
    </div>
  )
}
