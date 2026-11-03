import React from 'react'
import { m } from '#/paraglide/messages'

export interface MdxUnknownProps {
  /** 無法辨識的元件名稱 */
  name: string
  children?: React.ReactNode
}

/**
 * 渲染端看不懂的元件（例如舊版 renderer 遇到新元件）一律降級成這個區塊，
 * 保留子內容，不讓整頁崩潰。虛線框，像紙上留了一塊空白。
 */
export const MdxUnknown = ({ name, children }: MdxUnknownProps) => (
  <div className="mdx-block mdx-unknown not-prose">
    <p className="mb-2">{m.mdx_unknown_block({ name })}</p>
    {children && <div className="prose dark:prose-invert">{children}</div>}
  </div>
)
