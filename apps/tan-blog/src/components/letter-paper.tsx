import type { ReactNode } from 'react'
import { getSolarTerm } from '@/lib/season'
import { ganzhiYear } from '@/lib/ganzhi'
import { cn } from '@/lib/utils'

// 信箋：文章與日記的閱讀區（styles.css「信箋」）。
// 2026-11-02 站主：全拿掉太單調，只留兩樣——朱色「文武線」箋框、文末落款的朱印。
// 疊紙、陰影、毛邊、紙紋、季節花木都不回來：紙就是頁面的紙。

export function LetterPaper({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('letter-paper', className)}>{children}</div>
}

// 署名與印文：作者名，不隨站名變動
const SIGNATURE = '唯一'

// 落款：「丙午年　霜降／唯一　書」＋朱印。節氣用朱，其餘是墨
export function LetterSignature({ date, className }: { date: Date | string; className?: string }) {
  const { term } = getSolarTerm(new Date(date))
  return (
    <div lang="zh-Hant" className={cn('mt-14 flex items-end justify-end gap-4', className)}>
      <div className="text-right font-display leading-relaxed">
        <p className="text-ink-3">
          {ganzhiYear(date)}年　<span className="text-zhu">{term}</span>
        </p>
        <p className="text-ink-2">{SIGNATURE}　書</p>
      </div>
      <span aria-hidden className="seal">
        <span className="seal-text">{SIGNATURE}</span>
      </span>
    </div>
  )
}
