// 導覽與站尾的共用小件：焦點圈、站內外連結
import type React from 'react'
import { Link } from '@tanstack/react-router'

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
