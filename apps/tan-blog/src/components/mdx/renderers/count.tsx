'use client'

import { useState } from 'react'
import { PlusIcon } from 'lucide-react'

// 互動元件的示範：一個框、題簽放計數，按鈕走站上的工具樣式
export const Count = () => {
  const [count, setCount] = useState(0)

  return (
    <div className="mdx-block mdx-frame not-prose">
      <div className="mdx-block-head">
        <span className="mdx-block-label mdx-mono">Count: {count}</span>
        <button
          type="button"
          className="mdx-tool"
          data-accent
          onClick={() => setCount(count + 1)}
        >
          <PlusIcon aria-hidden />
          Increment
        </button>
      </div>
    </div>
  )
}
