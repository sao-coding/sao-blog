import React from 'react'

export interface MdxUnknownProps {
  /** 無法辨識的元件名稱 */
  name: string
  children?: React.ReactNode
}

/**
 * 渲染端看不懂的元件（例如舊版 renderer 遇到新元件）一律降級成這個區塊，
 * 保留子內容，不讓整頁崩潰。
 */
export const MdxUnknown = ({ name, children }: MdxUnknownProps) => (
  <div className="not-prose my-4 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
    <p className="mb-2">此區塊（{name}）目前無法顯示。</p>
    {children && <div className="prose dark:prose-invert">{children}</div>}
  </div>
)
