'use client'

import { useEffect, useState } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { Wifi, WifiOff, Monitor, Music, Smartphone } from 'lucide-react'

type DevicePayload = {
  status?: string
  message?: string
  data?: {
    app?: { name?: string; title?: string }
    music?: { name?: string; title?: string }
  }
}

const WS_URL = `${process.env.NEXT_PUBLIC_WS_URL}/public/devices/ws`

const DevicesStatus = () => {
  const [payload, setPayload] = useState<DevicePayload | null>(null)
  const [connected, setConnected] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    let ws: WebSocket | null = null
    let reconnectTimer: number | null = null

    const connect = () => {
      ws = new WebSocket(WS_URL)

      ws.onopen = () => {
        setConnected(true)
      }

      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data)
          setPayload(data)
        } catch (e) {
          // ignore invalid messages
           
          console.error('Invalid WS message:', e)
        }
      }

      ws.onerror = () => {
        // errors are handled in onclose; keep simple
      }

      ws.onclose = () => {
        setConnected(false)
        // try reconnect after a short delay
        reconnectTimer = window.setTimeout(connect, 3000)
      }
    }

    connect()

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (ws) {
        ws.onclose = null
        ws.onmessage = null
        ws.close()
      }
    }
  }, [])

  const appTitle =
    payload?.data?.app?.title || payload?.data?.app?.name || 'No app running'
  const musicTitle =
    payload?.data?.music?.title ||
    payload?.data?.music?.name ||
    'No music playing'
  const status = payload?.status || (connected ? 'connected' : 'disconnected')
  const message = payload?.message || ''

  const isConnected = status === 'success' || status === 'connected'
  const statusColor = isConnected ? 'text-green-500' : 'text-gray-400'
  const ConnectionIcon = isConnected ? Wifi : WifiOff

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <TooltipProvider>
      <div
        className="relative ml-4 flex items-center"
        style={{ width: isExpanded ? '140px' : '48px', height: '48px' }}
      >
        <Tooltip>
          <TooltipTrigger render={
            <div
              className={`absolute cursor-pointer p-2 bg-background border rounded-lg shadow-sm hover:shadow-md transition-all duration-300 ${
                isExpanded
                  ? 'transform translate-x-0'
                  : 'transform translate-x-0'
              }`}
              onClick={toggleExpanded}
              style={{
                zIndex: 3,
                transform: isExpanded ? 'translateX(0px)' : 'translateX(0px)',
              }}
            >
              <ConnectionIcon className={`h-5 w-5 ${statusColor}`} />
            </div>            
          }>

          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <div
                  className={`h-2 w-2 rounded-full ${
                    isConnected ? 'bg-green-500' : 'bg-gray-400'
                  }`}
                />
                <span className="font-medium capitalize">{status}</span>
              </div>
              {message && (
                <p className="text-xs text-muted-foreground">{message}</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger render={
            
            <div
              className={`absolute cursor-pointer p-2 bg-background border rounded-lg shadow-sm hover:shadow-md transition-all duration-300 ${
                isExpanded ? 'opacity-100' : 'opacity-80'
              }`}
              onClick={toggleExpanded}
              style={{
                zIndex: 2,
                transform: isExpanded ? 'translateX(46px)' : 'translateX(4px)',
              }}
            >
              <Monitor
                className={`h-5 w-5 ${
                  payload?.data?.app ? 'text-blue-500' : 'text-gray-400'
                }`}
              />
            </div>
          }>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Monitor className="h-3 w-3" />
                <span className="font-medium">Current App</span>
              </div>
              <p className="text-sm">{appTitle}</p>
            </div>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger render={
            <div
              className={`absolute cursor-pointer p-2 bg-background border rounded-lg shadow-sm hover:shadow-md transition-all duration-300 ${
                isExpanded ? 'opacity-100' : 'opacity-60'
              }`}
              onClick={toggleExpanded}
              style={{
                zIndex: 1,
                transform: isExpanded ? 'translateX(92px)' : 'translateX(8px)',
              }}
            >
              <Music
                className={`h-5 w-5 ${
                  payload?.data?.music ? 'text-purple-500' : 'text-gray-400'
                }`}
              />
            </div>
          }>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Music className="h-3 w-3" />
                <span className="font-medium">Now Playing</span>
              </div>
              <p className="text-sm">{musicTitle}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}

export default DevicesStatus
