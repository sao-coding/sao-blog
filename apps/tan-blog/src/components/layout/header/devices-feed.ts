// 站主裝置狀態的資料源：WebSocket 收視窗／音樂，CDN 拿 app 圖示與說明。畫法在 owner-mark.tsx
import { useEffect, useRef, useState } from 'react'
import { env } from '@sao-blog/env/tan-blog'

// Types
export type WindowInfo = {
  time: string
  type: 'window'
  status: 'active' | 'idle'
  process: string
  app: string
  title: string
}

export type MusicInfo = {
  time: string
  type: 'music'
  status: 'playing' | 'paused' | 'idle'
  title: string
  artist: string
}

export type ServerMessage = {
  status: string
  message: string
  data: {
    music: MusicInfo
    window: WindowInfo
  }
}

// Constants
export const CDN_DOMAIN =
  'https://fastly.jsdelivr.net/gh/sao-coding/apppulse-assets@master'
const WS_URL = `${env.VITE_WS_URL}/api/devices/ws`
const MAX_RECONNECT_ATTEMPTS = 6
const BASE_DELAY_MS = 800


// Custom hooks
export function useWebSocket(onMessage: (data: ServerMessage) => void) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimerRef = useRef<number | null>(null)
  const shouldReconnectRef = useRef(true)

  const scheduleReconnect = () => {
    const attempts = reconnectAttemptsRef.current
    if (attempts >= MAX_RECONNECT_ATTEMPTS) return

    reconnectAttemptsRef.current = attempts + 1

    const backoff = Math.min(BASE_DELAY_MS * Math.pow(1.8, attempts), 30_000)
    const jitter = Math.random() * 300
    const delay = Math.round(backoff + jitter)

    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current)
    }

    reconnectTimerRef.current = window.setTimeout(() => {
      reconnectTimerRef.current = null
      connect()
    }, delay)
  }

  const connect = () => {
    if (typeof window === 'undefined' || !('WebSocket' in window)) return

    try {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        reconnectAttemptsRef.current = 0
      }

      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data) as ServerMessage
          onMessage(data)
        } catch (e) {
          // ignore malformed messages
        }
      }

      ws.onclose = () => {
        if (shouldReconnectRef.current) {
          scheduleReconnect()
        }
      }

      ws.onerror = () => {
        if (shouldReconnectRef.current) {
          try {
            ws.close()
          } catch (e) {
            /* ignore */
          }
        }
      }
    } catch (e) {
      scheduleReconnect()
    }
  }

  const cleanup = () => {
    shouldReconnectRef.current = false
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    try {
      wsRef.current?.close()
    } catch (e) {
      /* ignore */
    }
  }

  const initialize = () => {
    shouldReconnectRef.current = true
    connect()
    return cleanup
  }

  return { initialize }
}

export function useAssets() {
  const [appIcons, setAppIcons] = useState<Record<string, string> | null>(null)
  const [appDescriptions, setAppDescriptions] = useState<Record<
    string,
    string
  > | null>(null)

  useEffect(() => {
    let mounted = true

    const fetchAssets = async () => {
      try {
        const [iconsRes, descRes] = await Promise.all([
          // 圖示與說明不影響首屏，用低優先度抓，不跟 CSS、字體搶頻寬
          fetch(`${CDN_DOMAIN}/app-icon.json`, { priority: 'low' }),
          fetch(`${CDN_DOMAIN}/app-desc.json`, { priority: 'low' }),
        ])

        if (!mounted) return

        if (iconsRes.ok) {
          const icons = (await iconsRes.json()) as Record<string, string>
          setAppIcons(icons)
        }

        if (descRes.ok) {
          const desc = (await descRes.json()) as Record<string, string>
          setAppDescriptions(desc)
        }
      } catch (e) {
        // ignore network errors
      }
    }

    fetchAssets()

    return () => {
      mounted = false
    }
  }, [])

  return { appIcons, appDescriptions }
}

// Utility functions
export const isMusicActive = (music?: MusicInfo) => {
  if (!music) return false
  const hasMetadata = Boolean(
    (music.title && music.title.trim() !== '') ||
      (music.artist && music.artist.trim() !== '')
  )
  return music.status === 'playing' || hasMetadata
}

const resolveAppIconId = (
  processName?: string,
  appIcons?: Record<string, string> | null
): string | null => {
  if (!processName || !appIcons) return null

  const keys = Object.keys(appIcons)
  // exact match
  let foundKey = keys.find((k) => k === processName)
  if (!foundKey) {
    // partial matches
    foundKey = keys.find(
      (k) => processName.includes(k) || k.includes(processName)
    )
  }
  return foundKey ? appIcons[foundKey] : null
}

export const getAppIconUrl = (
  processName?: string,
  appIcons?: Record<string, string> | null
) => {
  const id = resolveAppIconId(processName, appIcons)
  return id ? `${CDN_DOMAIN}/apps/${id}.png` : null
}
