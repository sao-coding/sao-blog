// 站主現在在做什麼：正在用的 app 或正在聽的歌（首頁卡片裡另有頭像，右下一盞小燈，有在活動就點著）。
// 邏輯照原本的 DevicesStatus：視窗與音樂兩種、點一下切換、視窗變 idle 自動換到音樂；
// 外觀改成紙上的字：不用彈跳、換內容時墨暈出來，細節寫在垂下來的紙條上。
import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Avatar, AvatarFallback, AvatarImage } from '@sao-blog/ui/components/avatar'
import { cn } from '@/lib/utils'
import {
  getAppIconUrl,
  isMusicActive,
  useAssets,
  useWebSocket,
  type MusicInfo,
  type ServerMessage,
  type WindowInfo,
} from './devices-feed'
import { m } from '#/paraglide/messages'
import { focusRing } from './nav-parts'

type Mode = 'window' | 'music'

const MUSIC_STATUS: Record<string, () => string> = {
  playing: m.nav_music_playing,
  paused: m.nav_music_paused,
  stopped: m.nav_music_stopped,
  idle: m.nav_music_idle,
}

export function useOwnerActivity() {
  const [windowInfo, setWindowInfo] = useState<WindowInfo | null>(null)
  const [musicInfo, setMusicInfo] = useState<MusicInfo | null>(null)
  const [mode, setMode] = useState<Mode>('window')
  const { appIcons, appDescriptions } = useAssets()

  // 同原本 DevicesStatus：idle 當作沒有；視窗沒了但有音樂就換到音樂，視窗一回來就換回視窗
  const { initialize } = useWebSocket((data: ServerMessage) => {
    const w = data?.data?.window && data.data.window.status !== 'idle' ? data.data.window : null
    const mu = data?.data?.music && data.data.music.status !== 'idle' ? data.data.music : null
    setWindowInfo(w)
    setMusicInfo(mu)
    setMode((prev) => {
      if (prev === 'window' && !w && mu) return 'music'
      if (prev === 'music' && w) return 'window'
      return prev
    })
  })
  useEffect(() => initialize(), [])

  const showing: Mode | null = mode === 'window' && windowInfo ? 'window' : mode === 'music' && musicInfo ? 'music' : null
  const canToggle = Boolean(windowInfo && musicInfo)

  let line: { verb: string; what: string; detail: string[]; icon: string | null; music?: 'playing' | 'paused' | 'none' } | null = null
  if (showing === 'window' && windowInfo) {
    const name = windowInfo.app || windowInfo.process || ''
    line = {
      verb: name ? m.nav_using() : m.nav_owner_online(),
      what: name,
      detail: [appDescriptions?.[windowInfo.process ?? ''] || windowInfo.title, windowInfo.time].filter(Boolean),
      icon: getAppIconUrl(windowInfo.process, appIcons),
    }
  } else if (showing === 'music' && musicInfo) {
    const active = isMusicActive(musicInfo)
    line = active
      ? {
          verb: m.nav_listening(),
          what: `〈${musicInfo.title || m.nav_music_unknown()}〉`,
          detail: [musicInfo.artist, MUSIC_STATUS[musicInfo.status]?.() ?? '', musicInfo.time].filter(Boolean),
          icon: null,
          music: musicInfo.status === 'playing' ? 'playing' : 'paused',
        }
      : { verb: '', what: m.nav_music_none(), detail: [musicInfo.time].filter(Boolean), icon: null, music: 'none' }
  }

  return {
    lit: Boolean(windowInfo || musicInfo),
    line,
    mode: showing,
    canToggle,
    toggle: () => canToggle && setMode((m) => (m === 'window' ? 'music' : 'window')),
  }
}

/**
 * 聽音樂：毛筆畫的一個八分音符（符頭濃墨、符桿上細下粗、符尾一筆甩出去），
 * 播放中右邊兩道聲紋像水紋一樣一圈圈盪開（燈色）；暫停時墨淡一階、聲紋停在淡淡的一道；沒在播只剩淡墨的音符。
 */
function InkMusic({ state, className }: { state: 'playing' | 'paused' | 'none'; className?: string }) {
  return (
    <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
      <g
        fill="currentColor"
        className={cn(state === 'playing' ? 'text-foreground/85' : state === 'paused' ? 'text-foreground/55' : 'text-foreground/30')}
      >
        {/* 符頭：斜放的濃墨點，右上角留一點飛白 */}
        <path d="M8.2 26.8 C 7.4 23.9, 10.6 21.2, 14.2 21.1 C 16.9 21, 18.4 22.6, 17.6 24.8 C 16.7 27.4, 13.6 29, 11 28.9 C 9.6 28.8, 8.6 28.1, 8.2 26.8 Z" />
        <path d="M13.2 22.4 C 14.6 22.1, 15.8 22.4, 16.3 23" fill="none" stroke="var(--background)" strokeWidth="0.7" strokeLinecap="round" opacity="0.7" />
        {/* 符桿：由下往上提筆，上細下粗 */}
        <path d="M16.4 24.2 C 16.6 18, 17 12, 17.6 6.4 C 17.8 5.6, 18.7 5.6, 18.8 6.5 C 18.6 12.4, 18.3 18.4, 18 24 Z" />
        {/* 符尾：一筆甩出去再收回 */}
        <path d="M18.4 6.6 C 21.6 7.8, 25.4 10.4, 25.2 14.6 C 25.1 16.2, 24.5 17.3, 23.6 18 C 24.1 15.2, 22.6 12.6, 18.4 11.2 Z" />
      </g>
      {state !== 'none' && (
        <g fill="none" stroke="var(--lamp)" strokeLinecap="round">
          <path d="M28 15.2 C 29.6 17.4, 29.6 20.2, 28 22.4" strokeWidth="1.5" className={state === 'playing' ? 'ink-ripple' : 'opacity-40'} />
          {state === 'playing' && <path d="M31 12.6 C 33.8 16.2, 33.8 21.4, 31 25" strokeWidth="1.1" className="ink-ripple ink-ripple-2" />}
        </g>
      )}
    </svg>
  )
}

export function OwnerAvatar({ lit, className }: { lit: boolean; className?: string }) {
  return (
    <Link to="/" aria-label={m.nav_back_home()} className={cn('relative shrink-0 rounded-full', focusRing, className)}>
      <Avatar className="size-10">
        <AvatarImage src="/img/avatar-96.webp" />
        <AvatarFallback>唯</AvatarFallback>
      </Avatar>
      <span className="owner-lamp" data-lit={lit ? '' : undefined} role="img" aria-label={lit ? m.nav_owner_online() : m.nav_owner_offline()} />
    </Link>
  )
}

/**
 * app／音樂圖示（跟原本一樣大）＋「在用 X」「在聽〈曲名〉」。
 * 視窗與音樂都有時，圖示下兩點：點著的是目前顯示的那個，點一下切換。
 * compact（桌機 < 1280、手機 header）只留圖示，字收進紙條。
 */
export function ActivityLine({
  activity,
  compact,
  inline,
  className,
}: {
  activity: ReturnType<typeof useOwnerActivity>
  compact?: boolean
  inline?: boolean
  className?: string
}) {
  const { line, mode, canToggle, toggle } = activity
  const iconSize = inline ? 'size-6' : 'size-9'
  // 窄的地方不在時什麼都不寫，頭像上那盞熄掉的燈就夠了
  if (!line && compact) return null
  if (!line) return <span className={cn('font-wenkai text-xs tracking-[0.18em] text-foreground/35', className)}>{m.nav_lamp_out()}</span>

  const said = `${line.verb} ${line.what}`.trim()
  const slip = compact ? [said, ...line.detail] : line.detail
  return (
    <span className={cn('group/act relative', className)}>
      <button
        type="button"
        onClick={toggle}
        aria-disabled={!canToggle}
        aria-label={said}
        className={cn(
          'flex items-center font-wenkai text-xs tracking-[0.12em] text-foreground/55 hover:text-foreground',
          inline ? 'max-w-full gap-3 text-left' : 'max-w-[15rem] gap-2',
          !canToggle && 'cursor-default',
          focusRing
        )}
      >
        <span className={cn("relative flex shrink-0 items-center justify-center", iconSize)}>
          {line.music ? (
            <InkMusic key="music" state={line.music} className={cn("nav-rise", iconSize)} />
          ) : line.icon ? (
            // key：換 app／換到音樂時，墨重新暈出來
            <img key={line.icon} src={line.icon} alt="" className={cn("nav-rise", iconSize)} />
          ) : (
            <span key={line.what} className="nav-rise flex size-7 items-center justify-center rounded-[3px] border border-rule font-mono text-xs text-foreground/50">
              {line.what.charAt(0) || '#'}
            </span>
          )}
          {canToggle && (
            <span aria-hidden="true" className="absolute -bottom-1.5 left-1/2 flex -translate-x-1/2 gap-1">
              <span className={cn('size-[3px] rounded-full', mode === 'window' ? 'bg-(--lamp)' : 'bg-foreground/25')} />
              <span className={cn('size-[3px] rounded-full', mode === 'music' ? 'bg-(--lamp)' : 'bg-foreground/25')} />
            </span>
          )}
        </span>
        {!compact && (
          <span key={said} className="nav-rise flex min-w-0 flex-col">
            <span className="flex min-w-0 items-baseline gap-1.5">
              {line.verb && <span className="shrink-0 text-foreground/40">{line.verb}</span>}
              <span className="truncate">{line.what}</span>
            </span>
            {inline && line.detail.length > 0 && (
              // 在卡片裡：細節排在名字下面（佔位置），跟圖示並排，不浮在別的東西上
              <span className="mt-1 truncate text-[11px] leading-snug tracking-[0.06em] text-foreground/40">{line.detail.join(' · ')}</span>
            )}
          </span>
        )}
      </button>
      {!inline && slip.length > 0 && (
        <span
          role="tooltip"
          className={cn(
            'invisible absolute left-0 top-full z-20 mt-2 w-max max-w-[16rem] -translate-y-1 rounded-[2px] border border-rule bg-background px-3 py-2 opacity-0',
            'font-wenkai text-xs leading-relaxed tracking-[0.06em] text-foreground/70',
            'transition-[opacity,translate,visibility] duration-150',
            'group-hover/act:visible group-hover/act:translate-y-0 group-hover/act:opacity-100 group-hover/act:transition-[opacity,translate]',
            'group-focus-within/act:visible group-focus-within/act:translate-y-0 group-focus-within/act:opacity-100'
          )}
        >
          {slip.map((s, i) => (
            <span key={i} className={cn('block', i > 0 && 'text-foreground/45')}>
              {s}
            </span>
          ))}
          {canToggle && <span className="mt-1 block text-[10px] text-foreground/35">{m.nav_tap_toggle()}</span>}
        </span>
      )}
    </span>
  )
}
