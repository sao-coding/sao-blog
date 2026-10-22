// 等頁面載入完、主執行緒空下來之後才執行：給純裝飾的動畫用（首頁的飄落物、燈籠、星星），
// 讓它們不跟首屏渲染、hydration 搶 CPU。回傳取消函式。
export function afterLoadIdle(callback: () => void, extraDelay = 800): () => void {
  let cancelled = false
  let timer = 0
  let idle = 0

  const schedule = () => {
    timer = window.setTimeout(() => {
      const run = () => {
        if (!cancelled) callback()
      }
      if ('requestIdleCallback' in window) idle = window.requestIdleCallback(run, { timeout: 2000 })
      else run()
    }, extraDelay)
  }

  if (document.readyState === 'complete') schedule()
  else window.addEventListener('load', schedule, { once: true })

  return () => {
    cancelled = true
    window.removeEventListener('load', schedule)
    window.clearTimeout(timer)
    if (idle && 'cancelIdleCallback' in window) window.cancelIdleCallback(idle)
  }
}
