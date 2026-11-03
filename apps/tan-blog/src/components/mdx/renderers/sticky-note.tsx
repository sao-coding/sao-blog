import React from 'react'
import { cn } from '@/lib/utils'

export interface MdxStickyNoteProps {
  title?: string
  /** 紙色，預設黃 */
  color?: 'yellow' | 'pink' | 'blue' | 'green'
  children?: React.ReactNode
  className?: string
}

/**
 * 便條紙：貼在文章裡的一張便條。沿用「想法」頁的 .sticky-note（紙紋、翹角陰影）與
 * .washi-tape（跟著季節換色的紙膠帶），文楷手寫字；微斜，滑過轉正。
 *
 * ```mdx
 * <StickyNote title="給未來的自己" color="pink">
 * 記得每年換一次備份硬碟。
 * </StickyNote>
 * ```
 */
export const MdxStickyNote = ({ title, color = 'yellow', children, className }: MdxStickyNoteProps) => (
  <div className={cn('mdx-block mdx-sticky sticky-note-wrap', className)} data-paper={color}>
    <div className="mdx-sticky-tilt">
      <aside className="sticky-note mdx-sticky-paper">
        <span aria-hidden className="washi-tape" />
        {title && <p className="mdx-sticky-title">{title}</p>}
        <div className="mdx-sticky-body">{children}</div>
      </aside>
    </div>
  </div>
)
