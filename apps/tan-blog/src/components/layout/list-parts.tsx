import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { siteTime } from '@/lib/site-time'

// 各列表頁共用的字層（DESIGN.md 第 8 節）：日期＋標題＋摘要的列，列之間只靠留白。
// 只用紙、五階墨、朱：標題 --ink-1、摘要 --ink-2、日期與 meta --ink-3、年份月份的大字 --ink-4（只做裝飾）。
// 滑過那一列標題轉朱（styles.css 的 .ink-row／.ink-title）。

/** 今年以前寫的：那一列標 data-old，標題退一階墨（--ink-2）。年份用站主時區 */
export const oldProps = (date: Date | string) =>
  siteTime(date).year() < siteTime(new Date()).year() ? { 'data-old': '' } : {}

/**
 * 頁首：小字（上一層）、標題、一行說明。
 * titleInNav：各區的首頁（文章、日記…）區名已經寫在右上墨點旁邊（components/layout/nav/site-nav.tsx），
 * 這裡的 h1 只留給螢幕閱讀器，畫面上不再寫第二次。
 */
export function ListHeader({
  eyebrow,
  title,
  titleStyle,
  titleInNav = false,
  children,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  titleInNav?: boolean
  /** 錨字（lib/page-transition.ts 的 anchorTitleStyle） */
  titleStyle?: CSSProperties
  children?: ReactNode
}) {
  return (
    <header className="mb-12">
      {eyebrow && <p className="mb-2 font-display text-sm text-ink-3">{eyebrow}</p>}
      <h1
        className={titleInNav ? 'sr-only' : 'font-display text-4xl text-balance text-ink-1'}
        style={titleStyle}
      >
        {title}
      </h1>
      {children && (
        <div className={cn('font-display text-sm leading-relaxed text-ink-3', !titleInNav && 'mt-3')}>{children}</div>
      )}
    </header>
  )
}

/** 分段的大字：年份或月份（淡墨，只做裝飾）＋一行小字 */
export function GroupMark({ big, small, id }: { big: ReactNode; small?: ReactNode; id?: string }) {
  return (
    <h2 data-enter id={id} className="mb-3 flex scroll-mt-28 items-baseline gap-3 font-display">
      <span className="text-5xl leading-none text-ink-4 tabular-nums select-none sm:text-6xl">{big}</span>
      {small && <span className="text-sm text-ink-3">{small}</span>}
    </h2>
  )
}

/**
 * 一列：左邊日期（頁邊的小字），右邊標題、摘要、meta。
 * 標題裡的 Link 用 `rowLinkClass` 撐滿整列當點擊區；摘要、meta 裡的其他連結加 `relative z-10` 疊在上面。
 */
export function ListRow({
  date,
  title,
  summary,
  meta,
  id,
  writtenAt,
  className,
}: {
  /** 寫作時間：今年以前的標題淡一階 */
  writtenAt?: Date | string
  date?: ReactNode
  title: ReactNode
  summary?: ReactNode
  meta?: ReactNode
  id?: string
  className?: string
}) {
  return (
    <article
      id={id}
      {...(writtenAt ? oldProps(writtenAt) : {})}
      className={cn(
        'ink-row group relative grid scroll-mt-28 grid-cols-[3.5rem_minmax(0,1fr)] gap-x-4 py-4 sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:gap-x-6',
        className,
      )}
    >
      <div className="pt-1 text-sm leading-snug text-ink-3 tabular-nums">{date}</div>
      <div className="min-w-0">
        <h3 className="ink-title font-display text-lg leading-snug text-balance sm:text-xl">{title}</h3>
        {summary && <div className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-2">{summary}</div>}
        {meta && (
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-ink-3">{meta}</div>
        )}
      </div>
    </article>
  )
}

export const rowLinkClass = "after:absolute after:inset-0 after:content-['']"

/** meta 裡的連結（分類、標籤）：疊在整列的點擊區上面，滑過轉朱 */
export const metaLinkClass = 'relative z-10 transition-colors hover:text-zhu'
