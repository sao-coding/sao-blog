'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { env } from '@sao-blog/env/tan-blog'

// Cloudflare Turnstile（不用玩拼圖的人機驗證）。
// 沒有設定 VITE_TURNSTILE_SITE_KEY 時什麼都不渲染，後端也不會要求 token。

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string
      reset: (id?: string) => void
      remove: (id?: string) => void
    }
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
let scriptPromise: Promise<void> | null = null

function loadScript() {
  scriptPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = SCRIPT_SRC
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => {
      scriptPromise = null
      reject(new Error('Turnstile 載入失敗'))
    }
    document.head.appendChild(s)
  })
  return scriptPromise
}

export const turnstileSiteKey = env.VITE_TURNSTILE_SITE_KEY

export interface TurnstileHandle {
  /** 送出後要重設：每個 token 只能用一次 */
  reset: () => void
}

interface TurnstileProps {
  onToken: (token: string | null) => void
  /** 用來區分 dashboard 上的統計（comment / login） */
  action?: string
  className?: string
}

export const Turnstile = forwardRef<TurnstileHandle, TurnstileProps>(function Turnstile(
  { onToken, action, className },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)
  const onTokenRef = useRef(onToken)
  onTokenRef.current = onToken

  useImperativeHandle(ref, () => ({
    reset: () => {
      onTokenRef.current(null)
      if (widgetId.current) window.turnstile?.reset(widgetId.current)
    },
  }))

  useEffect(() => {
    if (!turnstileSiteKey) return
    let cancelled = false
    loadScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return
        widgetId.current = window.turnstile.render(containerRef.current, {
          sitekey: turnstileSiteKey,
          action,
          theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
          // 大部分訪客不會看到任何東西；需要互動時才顯示
          appearance: 'interaction-only',
          callback: (token: string) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(null),
          'error-callback': () => onTokenRef.current(null),
        })
      })
      .catch(() => onTokenRef.current(null))
    return () => {
      cancelled = true
      if (widgetId.current) window.turnstile?.remove(widgetId.current)
      widgetId.current = null
    }
  }, [action])

  if (!turnstileSiteKey) return null
  return <div ref={containerRef} className={className} />
})
