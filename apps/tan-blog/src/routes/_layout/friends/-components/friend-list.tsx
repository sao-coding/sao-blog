import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { InferClientOutputs } from '@orpc/client'
import dayjs from 'dayjs'
import type { client } from '@/lib/orpc'
import { m } from '#/paraglide/messages'
import { brush, hash, through } from './yousi'

type RouterOutputs = InferClientOutputs<typeof client>
export type FriendItem = RouterOutputs['friend']['getFriends']['data'][number]

export const hostOf = (url: string) => {
  try {
    return new URL(url).host.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** 圓頭像：平時淡一點，滑過透出原色；載好之前（外站可能很慢）或載不到，寫站名首字 */
export function FriendAvatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
  const [broken, setBroken] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const show = src && !broken
  return (
    <span
      className={`friend-avatar relative grid shrink-0 place-items-center overflow-hidden rounded-full border border-ink-4 bg-background font-display text-ink-2 ${className ?? ''}`}
    >
      {!(show && loaded) && <span aria-hidden>{[...name][0] ?? '・'}</span>}
      {show && (
        <img
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={() => setBroken(true)}
          // 伺服器畫的頁面：圖可能在 hydrate 之前就載入完或失敗，onLoad／onError 不會再觸發
          ref={(img) => {
            if (!img?.complete) return
            if (img.naturalWidth === 0) setBroken(true)
            else setLoaded(true)
          }}
          className="absolute inset-0 size-full object-cover"
        />
      )}
    </span>
  )
}

// 友鏈名單（丙「游絲」，2026-11-03 站主定）：朋友的頭像像珠子串在一筆細墨上。
// 排法是普通的格子（版面寬一排三欄、窄的兩欄，看版面寬不看視窗），站名寫在頭像下面、可以換行，名字再長都完整；
// 每顆頭像依站名上下錯開一點，游絲在瀏覽器量好每一排頭像的中心，一筆順順地穿過去、兩端拉到版面外。
// 介紹、網址、最近一篇：寬版滑過或鍵盤移到時浮出一張小卡（DESIGN.md 第 1 節「卡片」），窄版直接寫在站名下面。
// 最後一組的最後一顆是虛線的「你的名字 ↓」，連到申請表單。

/** 依站名上下錯開多少（px）：一高一低交錯，再由站名微調 */
const lift = (i: number, id: string) => (i % 2 === 0 ? -1 : 1) * (14 + (hash(id) % 11))

export function FriendList({ items, group, apply }: { items: FriendItem[]; group: string; apply?: boolean }) {
  const box = useRef<HTMLUListElement>(null)
  const beadClass = 'friend relative flex flex-col items-center px-1 text-center translate-y-(--lift)'

  return (
    <div className="@container">
      <div className="relative">
        <Lines box={box} group={group} count={items.length + (apply ? 1 : 0)} />
        <ul ref={box} className="relative grid grid-cols-2 gap-x-3 gap-y-14 pt-4 @2xl:grid-cols-3 @2xl:gap-y-16">
          {items.map((friend, i) => (
            <li key={friend.id} data-enter className={beadClass} style={{ '--lift': `${lift(i, friend.id)}px` } as CSSProperties}>
              <a href={friend.url} target="_blank" rel="noopener noreferrer" className="friend-link flex flex-col items-center gap-2.5">
                <FriendAvatar name={friend.name} src={friend.avatar} className="size-12 text-lg @2xl:size-14 @2xl:text-xl" />
                <span className="friend-name font-display text-base leading-snug text-balance break-words text-ink-1 @2xl:text-lg">
                  {friend.name}
                </span>
              </a>
              {/* 窄版：直接寫在站名下面 */}
              <p className="mt-1 line-clamp-2 text-xs leading-snug text-ink-3 @2xl:hidden">{friend.description || hostOf(friend.url)}</p>
              {/* 寬版：滑過或鍵盤移到時浮出的小卡 */}
              <div className="friend-pop absolute top-full left-1/2 z-20 mt-2 hidden w-64 -translate-x-1/2 rounded-lg border border-ink-5 bg-background px-4 py-3 text-left @2xl:block">
                <p className="font-mono text-xs text-ink-3">{hostOf(friend.url)}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{friend.description || m.friends_no_description()}</p>
                {friend.latest && (
                  <a
                    href={friend.latest.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 flex items-baseline gap-2 border-t border-ink-5 pt-2 text-xs text-ink-3 transition-colors hover:text-zhu"
                  >
                    <span className="shrink-0 font-display">{m.friends_latest()}</span>
                    <span className="min-w-0 truncate text-ink-2">{friend.latest.title}</span>
                    {friend.latest.publishedAt && (
                      <time dateTime={dayjs(friend.latest.publishedAt).toISOString()} className="shrink-0 tabular-nums">
                        {dayjs(friend.latest.publishedAt).format('MM-DD')}
                      </time>
                    )}
                  </a>
                )}
              </div>
            </li>
          ))}
          {apply && (
            <li data-enter className={beadClass} style={{ '--lift': `${lift(items.length, 'apply')}px` } as CSSProperties}>
              <a href="#apply" className="friend-link flex flex-col items-center gap-2.5">
                <span className="friend-avatar size-12 rounded-full border border-dashed border-ink-4 bg-background @2xl:size-14" />
                <span className="friend-name font-display text-base text-ink-3 @2xl:text-lg">{m.friends_offer_preview()} ↓</span>
              </a>
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}

/** 每一排一筆游絲：量每一排頭像的中心，穿過去；只在瀏覽器上畫，捲到才由左往右寫出來 */
function Lines({ box, group, count }: { box: React.RefObject<HTMLUListElement | null>; group: string; count: number }) {
  const svg = useRef<SVGSVGElement>(null)
  const [lines, setLines] = useState<{ ink: string; center: string }[]>([])
  const [written, setWritten] = useState(false)

  // 用 useEffect：名單（box）的 ref 在這個元件之後才接上，layout effect 時還是 null
  useEffect(() => {
    const list = box.current
    const el = svg.current
    if (!list || !el) return
    let frame = 0
    const draw = () => {
      const o = el.getBoundingClientRect()
      const rows = new Map<number, { x: number; y: number }[]>()
      for (const li of list.children as HTMLCollectionOf<HTMLElement>) {
        const av = li.querySelector('.friend-avatar')
        if (!av) continue
        const r = av.getBoundingClientRect()
        const row = rows.get(li.offsetTop) ?? []
        row.push({ x: r.left + r.width / 2 - o.left, y: r.top + r.height / 2 - o.top })
        rows.set(li.offsetTop, row)
      }
      setLines(
        [...rows.values()].map((pts, i) => {
          pts.sort((a, b) => a.x - b.x)
          // 兩端拉到版面外一個頁邊（16px），像從紙外穿進來；一顆的那排就斜斜帶過
          const first = pts[0]
          const last = pts.at(-1)!
          const tilt = pts.length > 1 ? (last.y - first.y) * 0.4 : 10
          const ends = [{ x: -16, y: first.y - tilt }, ...pts, { x: o.width + 16, y: last.y + tilt }]
          return brush(through(ends), `${group}:${i}`)
        }),
      )
    }
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(draw)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(list)
    document.fonts?.ready.then(update)
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        setWritten(true)
        io.disconnect()
      },
      { rootMargin: '0px 0px -15% 0px' },
    )
    io.observe(el)
    return () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
      io.disconnect()
    }
  }, [box, group, count])

  const id = `yousi-${hash(group)}`
  return (
    <svg ref={svg} aria-hidden className="yousi pointer-events-none absolute inset-0 size-full overflow-visible text-ink-1" data-written={written}>
      {lines.map((l, i) => (
        <g key={`${i}:${l.center.length}`} style={{ '--i': i } as CSSProperties}>
          <mask id={`${id}-${i}`} maskUnits="userSpaceOnUse" x="-50" y="-200" width="4000" height="100000">
            <path className="yousi-reveal" d={l.center} pathLength={1} fill="none" stroke="white" strokeWidth="16" strokeLinecap="round" />
          </mask>
          <path className="yousi-ink" mask={`url(#${id}-${i})`} d={l.ink} fillOpacity={0.78} />
        </g>
      ))}
    </svg>
  )
}
