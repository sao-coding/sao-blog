'use client'

import React, { useId, useState } from 'react'
import { m } from '#/paraglide/messages'

/**
 * 旁註（行內）：寫在句子裡，`這個做法有代價<Sidenote>例如記憶體會多用一倍。</Sidenote>。`
 * - 文中留一個朱色上標編號（CSS counter，整篇連號）
 * - 桌機：註解浮在段落右側，像寫在信紙邊上的批注
 * - 手機：預設收起，點編號才在原地展開
 * 會出現在 <p> 裡，所以全部用 span。
 */
export const MdxSidenote = ({ children }: { children?: React.ReactNode }) => {
  const [open, setOpen] = useState(false)
  const id = useId()

  return (
    <span className="mdx-sidenote" data-open={open || undefined}>
      <button
        type="button"
        className="mdx-sidenote-mark"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="sr-only">{m.sidenote_label()}</span>
      </button>
      <span id={id} role="note" className="mdx-sidenote-body">
        {children}
      </span>
    </span>
  )
}
