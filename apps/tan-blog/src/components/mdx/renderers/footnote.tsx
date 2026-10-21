import React from 'react'
import { CornerLeftUpIcon } from 'lucide-react'
import { m } from '#/paraglide/messages'

type AnchorProps = React.AnchorHTMLAttributes<HTMLAnchorElement>

/** remark-gfm 產生的註腳返回連結：<a data-footnote-backref aria-label="Back to reference 1">↩<sup>2</sup></a> */
export const isFootnoteBackref = (props: AnchorProps) =>
  (props as Record<string, unknown>)['data-footnote-backref'] !== undefined

/**
 * 註腳的「返回」連結。remark-gfm 預設放的是 ↩（U+21A9），很多系統（尤其 Windows）
 * 會把它畫成彩色 emoji、還帶藍色底，每台設備長得都不一樣；這裡換成 SVG 圖示，
 * 同一個註腳被引用多次時的 <sup>2</sup> 保留。在 renderer 換，舊文章不用重新編譯。
 * aria-label 原本是英文的 "Back to reference 1-2"，取出編號改成三語。
 */
export function FootnoteBackref({ children, className, ...props }: AnchorProps) {
  // "1" 或 "1-2"（同一個註腳的第 2 處引用）
  const [ref = '', nth] = (props['aria-label']?.replace(/^Back to reference\s*/, '') ?? '').split('-')
  const label = nth ? m.footnote_back_nth({ ref, nth }) : m.footnote_back({ ref })
  const rest = React.Children.toArray(children).filter(
    (child) => !(typeof child === 'string' && child.trim() === '↩')
  )
  return (
    <a
      {...props}
      className={['mdx-fn-back', className].filter(Boolean).join(' ')}
      aria-label={label}
    >
      <CornerLeftUpIcon aria-hidden />
      {rest}
    </a>
  )
}
