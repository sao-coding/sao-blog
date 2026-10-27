// 導覽的共用小件：焦點圈、站內外連結、筆刷橫線、節氣日期
import type React from 'react'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { getSolarTerm } from '@/lib/season'
import { inkDryness } from '@/lib/season-spec'

/** 鍵盤焦點：一圈淡朱髮絲線，不靠底色 */
export const focusRing =
  'outline-none rounded-[2px] focus-visible:ring-1 focus-visible:ring-ink/70 focus-visible:ring-offset-4 focus-visible:ring-offset-background'

/** 站內走 Link、外部與 /rss.xml 走 <a> */
export function NavLink({
  href,
  external,
  ...props
}: Omit<React.ComponentProps<'a'>, 'href'> & { href: string; external?: boolean }) {
  return external || /^https?:\/\//.test(href) ? (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props} />
  ) : (
    <Link to={href} {...props} />
  )
}

/** 一筆有起收的橫線（捲動後 header 的下緣） */
export function BrushRule({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1000 6" preserveAspectRatio="none" className={cn('h-1.5 w-full', className)} aria-hidden="true">
      <path d="M0 3.4 C 120 2.2, 300 2.6, 520 3 S 880 3.6, 1000 2.8 L 1000 3.4 C 860 4.6, 600 4.2, 420 4 S 90 4.4, 0 3.4 Z" fill="currentColor" />
    </svg>
  )
}

/** 寫成節氣的日期（「霜降」），這個節氣寫的回傳 wet */
export function termOf(iso: string) {
  const dryness = inkDryness(iso)
  return { term: getSolarTerm(new Date(iso)).term, dryness, wet: dryness === 'wet' }
}
