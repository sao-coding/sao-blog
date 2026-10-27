'use client'

import { useState, type ReactNode } from 'react'
import type { InferClientOutputs } from '@orpc/client'
import dayjs from 'dayjs'
import type { client } from '@/lib/orpc'
import { cn } from '@/lib/utils'
import { m } from '#/paraglide/messages'

type RouterOutputs = InferClientOutputs<typeof client>
export type FriendItem = RouterOutputs['friend']['getFriends']['data'][number]

const hostOf = (url: string) => {
  try {
    return new URL(url).host.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** 短的漢字／假名站名直寫在繪馬右側；夾了拉丁字母或太長就橫寫在畫下面（直排的英文要歪頭讀） */
const writesVertically = (name: string) =>
  [...name].length <= 7 && /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(name) && !/[A-Za-z]/.test(name)

/** 每塊繪馬掛的角度固定（由站名算），不隨機：同一位朋友每次都歪同一個角度 */
function tiltOf(name: string) {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)!) % 997
  return ((h % 9) - 4) * 0.5
}

/** 繪馬的板子：五角家形、乾筆描邊。友鏈與奉納表單的預覽共用 */
export function EmaBoard({ name, avatar, host, children }: { name: string; avatar?: string | null; host?: string; children?: ReactNode }) {
  const vertical = writesVertically(name)
  return (
    <span className="ema-board">
      <svg aria-hidden viewBox="0 0 100 120" preserveAspectRatio="none" className="ema-board-shape">
        <path d="M2 24 L50 2 L98 24 L98 118 L2 118 Z" />
      </svg>
      <span className="ema-hole" aria-hidden />
      <span className={cn('ema-face', vertical && 'is-vertical')}>
        <span className="ema-picture">
          {avatar ? (
            <img src={avatar} alt="" loading="lazy" referrerPolicy="no-referrer" />
          ) : (
            <span aria-hidden className="font-wenkai text-2xl">{name.slice(0, 1)}</span>
          )}
        </span>
        <span className="ema-name font-wenkai" title={name}>{name || '　'}</span>
      </span>
      {host && <span className="ema-host font-mono">{host}</span>}
      {children}
    </span>
  )
}

// 繪馬掛：一位朋友一塊繪馬。板子連到對方首頁；滑過、聚焦（或觸控時點一下）
// 那塊晃一下，旁邊浮出「願文」紙條：背面的介紹＋朋友圈裡最近的一篇。
export function FriendGrid({ items, offering }: { items: FriendItem[]; offering?: boolean }) {
  // 觸控沒有滑過：第一下打開願文，第二下才去對方的站
  const [openId, setOpenId] = useState<FriendItem['id'] | null>(null)

  return (
    <div className="ema-rack">
      <svg aria-hidden className="ema-rack-frame" preserveAspectRatio="none" viewBox="0 0 100 100">
        <path className="ema-roof" d="M0.5 3 Q50 -1 99.5 3" />
        <path className="ema-post" d="M2.5 3 L2.3 100" />
        <path className="ema-post" d="M97.5 3 L97.7 100" />
      </svg>
      <ul className="ema-rows">
        {items.map((friend) => {
          const open = openId === friend.id
          return (
            <li
              key={friend.id}
              data-enter
              className={cn('ema-slot', open && 'is-open')}
              style={{ '--tilt': `${tiltOf(friend.name)}deg` } as React.CSSProperties}
              onMouseLeave={() => open && setOpenId(null)}
            >
              <a
                href={friend.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ema"
                aria-describedby={`wish-${friend.id}`}
                onClick={(e) => {
                  if (!open && window.matchMedia('(hover: none)').matches) {
                    e.preventDefault()
                    setOpenId(friend.id)
                  }
                }}
              >
                <EmaBoard name={friend.name} avatar={friend.avatar} host={hostOf(friend.url)} />
              </a>

              <div id={`wish-${friend.id}`} className="ema-wish glass-strong">
                <p className="font-wenkai text-sm leading-relaxed text-foreground">
                  {friend.description || m.friends_no_description()}
                </p>
                {friend.latest && (
                  <a
                    href={friend.latest.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 flex items-baseline gap-2 border-t border-dashed border-rule pt-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <span className="shrink-0 font-wenkai text-ink">{m.friends_latest()}</span>
                    <span className="min-w-0 flex-1 truncate" title={friend.latest.title}>
                      {friend.latest.title}
                    </span>
                    {friend.latest.publishedAt && (
                      <time dateTime={dayjs(friend.latest.publishedAt).toISOString()} className="shrink-0 font-mono tabular-nums">
                        {dayjs(friend.latest.publishedAt).format('MM-DD')}
                      </time>
                    )}
                  </a>
                )}
              </div>
            </li>
          )
        })}

        {offering && (
          <li className="ema-slot" data-enter>
            <a href="#apply" className="ema is-offering">
              <span className="ema-board">
                <svg aria-hidden viewBox="0 0 100 120" preserveAspectRatio="none" className="ema-board-shape">
                  <path d="M2 24 L50 2 L98 24 L98 118 L2 118 Z" />
                </svg>
                <span className="ema-hole" aria-hidden />
                <span className="ema-offer font-wenkai">{m.friends_offer()}</span>
              </span>
            </a>
          </li>
        )}
      </ul>
    </div>
  )
}
