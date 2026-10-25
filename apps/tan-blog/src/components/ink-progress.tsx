import { useRouterState } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

// 換頁的載入提示：超過 300ms 還沒好，才在頁面頂端用節氣色慢慢寫出一筆（最多寫到 85%），
// 載入完成時一口氣寫完再淡出。多數換頁有 hover 預載，根本不會出現。樣式見 styles.css 的 .ink-progress。
export function InkProgress() {
  const pending = useRouterState({ select: (s) => s.status === 'pending' })
  const [state, setState] = useState<'idle' | 'writing' | 'done'>('idle')

  useEffect(() => {
    if (pending) {
      const timer = window.setTimeout(() => setState('writing'), 300)
      return () => window.clearTimeout(timer)
    }
    setState((s) => (s === 'writing' ? 'done' : s))
  }, [pending])

  useEffect(() => {
    if (state !== 'done') return
    const timer = window.setTimeout(() => setState('idle'), 700)
    return () => window.clearTimeout(timer)
  }, [state])

  return <div aria-hidden className="ink-progress" data-state={state === 'idle' ? undefined : state} />
}
