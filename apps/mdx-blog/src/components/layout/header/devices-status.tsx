'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Types
type WindowInfo = {
  time: string
  type: 'window'
  status: 'active' | 'idle'
  process: string
  app: string
  title: string
}

type MusicInfo = {
  time: string
  type: 'music'
  status: 'playing' | 'paused' | 'idle'
  title: string
  artist: string
}

type ServerMessage = {
  status: string
  message: string
  data: {
    music: MusicInfo
    window: WindowInfo
  }
}

type DisplayMode = 'window' | 'music'

type SpringTransition = {
  type: 'spring'
  stiffness: number
  damping: number
  mass: number
}

// Constants
const CDN_DOMAIN =
  'https://fastly.jsdelivr.net/gh/sao-coding/apppulse-assets@master'
const WS_URL = `${process.env.NEXT_PUBLIC_WS_URL}/public/devices/ws`
const MAX_RECONNECT_ATTEMPTS = 6
const BASE_DELAY_MS = 800

const SUPER_BOUNCY_SPRING: SpringTransition = {
  type: 'spring',
  stiffness: 200,
  damping: 12,
  mass: 1,
}

const MUSIC_ICONS = {
  playing: '▶',
  paused: '⏸',
  stopped: '⏹',
  default: '♪',
} as const

// Custom hooks
function useWebSocket(onMessage: (data: ServerMessage) => void) {
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

function useAssets() {
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
          fetch(`${CDN_DOMAIN}/app-icon.json`),
          fetch(`${CDN_DOMAIN}/app-desc.json`),
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
const getMusicIcon = (status?: string) => {
  return MUSIC_ICONS[status as keyof typeof MUSIC_ICONS] || MUSIC_ICONS.default
}

const isMusicActive = (music?: MusicInfo) => {
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

const getAppIconUrl = (
  processName?: string,
  appIcons?: Record<string, string> | null
) => {
  const id = resolveAppIconId(processName, appIcons)
  return id ? `${CDN_DOMAIN}/apps/${id}.png` : null
}

// Components
interface AppIconProps {
  windowInfo: WindowInfo
  appIcons: Record<string, string> | null
  appDescriptions: Record<string, string> | null
}

function AppIcon({ windowInfo, appIcons, appDescriptions }: AppIconProps) {
  const url = getAppIconUrl(windowInfo.process, appIcons)

  if (url) {
    const alt =
      (appDescriptions && appDescriptions[windowInfo.process ?? '']) ||
      windowInfo.app ||
      windowInfo.process ||
      'app icon'
    return <img src={url} alt={alt} className="size-10" />
  }

  return (
    <div className="size-10 p-1">
      <div className="rounded-md flex h-full w-full items-center justify-center text-sm bg-slate-100 text-slate-700">
        {(windowInfo.process && windowInfo.process.charAt(0)) ?? '#'}
      </div>
    </div>
  )
}

interface MusicIconProps {
  musicInfo: MusicInfo
  // isActive: boolean
}
// cmusic.png
function MusicIcon({ musicInfo }: MusicIconProps) {
  // const bgColor = isActive
  //   ? 'bg-green-100 text-green-700'
  //   : 'bg-green-100 text-green-400'
  const url = `${CDN_DOMAIN}/apps/cmusic.png`
  const alt = musicInfo.title || 'music icon'

  return (
    // <div
    //   className={`size-10 rounded-md flex items-center justify-center text-lg ${bgColor}`}
    // >
    //   {getMusicIcon(musicInfo.status)}
    // </div>
    <img src={url} alt={alt} className="size-10" />
  )
}

// Tooltip content components
function WindowTooltipContent({
  info,
  appDescriptions,
}: {
  info: WindowInfo
  appDescriptions: Record<string, string> | null
}) {
  return (
    <div className="space-y-1">
      <div className="font-medium">
        {info.app ?? info.process ?? '未知應用'}
      </div>
      {appDescriptions && appDescriptions[info.process ?? ''] ? (
        <div className="text-sm text-muted-foreground">
          {appDescriptions[info.process ?? '']}
        </div>
      ) : (
        info.title && (
          <div className="text-sm text-muted-foreground">{info.title}</div>
        )
      )}
      {info.time && (
        <div className="text-xs text-muted-foreground">{info.time}</div>
      )}
    </div>
  )
}

function MusicTooltipContent({
  info,
  isActive,
}: {
  info: MusicInfo
  isActive: boolean
}) {
  if (!isActive) {
    return (
      <div className="space-y-1">
        <div className="font-medium text-muted-foreground">目前沒有播放</div>
        {info.time && (
          <div className="text-xs text-muted-foreground">{info.time}</div>
        )}
      </div>
    )
  }

  const statusText =
    {
      playing: '播放中',
      paused: '暫停',
      stopped: '停止',
      idle: '閒置',
    }[info.status || ''] || '未知'

  return (
    <div className="space-y-1">
      <div className="font-medium">{info.title || '未知曲目'}</div>
      {info.artist && (
        <div className="text-sm text-muted-foreground">{info.artist}</div>
      )}
      <div className="text-xs text-muted-foreground">狀態: {statusText}</div>
      {info.time && (
        <div className="text-xs text-muted-foreground">{info.time}</div>
      )}
    </div>
  )
}

// Main component
export default function DevicesStatus() {
  const [windowInfo, setWindowInfo] = useState<WindowInfo | null>(null)
  const [musicInfo, setMusicInfo] = useState<MusicInfo | null>(null)
  const [displayMode, setDisplayMode] = useState<DisplayMode>('window')
  const { appIcons, appDescriptions } = useAssets()

  const handleWebSocketMessage = (data: ServerMessage) => {
    // Determine incoming window/music info (treat 'idle' as null)
    const incomingWindow: WindowInfo | null = data?.data?.window
      ? data.data.window.status === 'idle'
        ? null
        : data.data.window
      : null

    const incomingMusic: MusicInfo | null = data?.data?.music
      ? data.data.music.status === 'idle'
        ? null
        : data.data.music
      : null

    // Update states
    setWindowInfo(incomingWindow)
    setMusicInfo(incomingMusic)

    // Auto-switch displayMode according to rules:
    // - If current display is 'window' but window became null and music exists -> switch to 'music'
    // - If current display is 'music' but music became null and window exists -> switch to 'window'
    // - If current display is 'music' but window became active (from idle) -> switch to 'window'
    // - If both null -> do not display (leave displayMode as-is; render will show empty)
    setDisplayMode((prev) => {
      if (prev === 'window') {
        if (!incomingWindow && incomingMusic) return 'music'
      }
      if (prev === 'music') {
        if (!incomingMusic && incomingWindow) return 'window'
        if (incomingWindow) return 'window' // Switch to window when it becomes active
      }
      return prev
    })
  }

  const { initialize } = useWebSocket(handleWebSocketMessage)

  useEffect(() => {
    return initialize()
  }, [])

  const toggleDisplayMode = () => {
    // If only one of windowInfo or musicInfo exists, disable toggling
    const hasWindow = Boolean(windowInfo)
    const hasMusic = Boolean(musicInfo)
    if ((hasWindow && !hasMusic) || (!hasWindow && hasMusic)) {
      // nothing to toggle
      return
    }

    setDisplayMode((prev) => (prev === 'window' ? 'music' : 'window'))
  }

  const renderContent = () => {
    if (displayMode === 'window' && windowInfo) {
      return (
        <motion.div
          key={`window-${windowInfo.process ?? 'unknown'}-${
            windowInfo.title ?? ''
          }`}
          initial={{ opacity: 0.0001, y: 25 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{
            opacity: 0,
            x: -5,
            transition: { type: 'tween', duration: 0.1, ease: 'easeInOut' },
          }}
          transition={SUPER_BOUNCY_SPRING}
          className='pointer-events-auto absolute inset-y-0 left-0 z-10 flex items-center overflow-hidden'
        >
          <Tooltip>
            <TooltipTrigger render={
              <div className="flex items-center justify-center size-10">
                <AppIcon
                  windowInfo={windowInfo}
                  appIcons={appIcons}
                  appDescriptions={appDescriptions}
                />
              </div>
            }>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <WindowTooltipContent
                info={windowInfo}
                appDescriptions={appDescriptions}
              />
            </TooltipContent>
          </Tooltip>
        </motion.div>
      )
    }

    if (displayMode === 'music' && musicInfo) {
      const isActive = isMusicActive(musicInfo)
      const key = isActive
        ? `music-${musicInfo.title ?? 'unknown'}-${musicInfo.artist ?? ''}`
        : `music-empty-${musicInfo.time ?? 'no-time'}`

      return (
        <motion.div
          key={key}
          initial={{ opacity: 0.0001, y: 25 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{
            opacity: 0,
            x: -5,
            transition: { type: 'tween', duration: 0.1, ease: 'easeInOut' },
          }}
          transition={SUPER_BOUNCY_SPRING}
          className='pointer-events-auto absolute inset-y-0 left-0 z-10 flex items-center overflow-hidden'
        >
          <Tooltip>
            <TooltipTrigger render={
              <div className="flex items-center justify-center size-10">
                <MusicIcon musicInfo={musicInfo} />
              </div>
            }>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <MusicTooltipContent info={musicInfo} isActive={isActive} />
            </TooltipContent>
          </Tooltip>
        </motion.div>
      )
    }

    return (
      <motion.div
        key="empty"
        initial={{ opacity: 0.0001, y: 25 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        exit={{ opacity: 0 }}
        transition={SUPER_BOUNCY_SPRING}
        style={{
          position: 'absolute',
          overflow: 'hidden',
          pointerEvents: 'auto',
        }}
        className="flex items-center justify-center size-10"
      />
    )
  }

  return (
    <TooltipProvider>
      <div
        className="relative flex size-10 items-center justify-center cursor-pointer select-none"
        onClick={toggleDisplayMode}
      >
        <AnimatePresence mode="wait">{renderContent()}</AnimatePresence>
      </div>
    </TooltipProvider>
  )
}
