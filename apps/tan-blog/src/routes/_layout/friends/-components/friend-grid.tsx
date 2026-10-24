import type { InferClientOutputs } from '@orpc/client'
import dayjs from 'dayjs'
import type { client } from '@/lib/orpc'
import { m } from '#/paraglide/messages'
import { FriendPreviewLink } from './friend-preview-link'

type RouterOutputs = InferClientOutputs<typeof client>
export type FriendItem = RouterOutputs['friend']['getFriends']['data'][number]

const hostOf = (url: string) => {
  try {
    return new URL(url).host.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** 後端還沒算出主色（或對方沒有可用的顏色）時，由站名算出固定的色相 */
function hueOf(name: string) {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)!) % 360
  return h
}

// 名片：上半是站名與介紹（連到對方首頁），下半是朋友圈裡最近的一篇（連到那篇文章）。
// 兩個連結分開放，避免 <a> 巢狀。
export function FriendGrid({ items }: { items: FriendItem[] }) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((friend) => {
        // 主色：後端從對方的 theme-color 或頭像取得（空字串代表找過但沒有）
        const accent = friend.accentColor || `oklch(0.7 0.12 ${hueOf(friend.name)})`
        return (
          <li
            key={friend.id}
            style={{ '--accent': accent } as React.CSSProperties}
            className="group relative flex flex-col overflow-hidden rounded-xl border border-rule bg-card/60 transition-all duration-300 hover:-translate-y-0.5 hover:border-[color-mix(in_oklch,var(--accent)_55%,transparent)] hover:shadow-[0_10px_24px_-16px_var(--accent)]"
          >
            {/* 右上角一抹顏色，像信封上的郵票 */}
            <span
              aria-hidden
              className="pointer-events-none absolute -top-10 -right-10 size-24 rounded-full opacity-25 blur-2xl transition-opacity group-hover:opacity-50"
              style={{ background: 'var(--accent)' }}
            />

            <FriendPreviewLink href={friend.url} className="relative flex flex-1 flex-col gap-3 p-4">
              <div className="flex items-center gap-3">
                <span className="rounded-full shrink-0 p-0.5" style={{ background: 'color-mix(in oklch, var(--accent) 45%, transparent)' }}>
                  {friend.avatar ? (
                    <img
                      src={friend.avatar}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="size-12 rounded-full bg-muted object-cover transition-transform duration-500 group-hover:rotate-[10deg]"
                    />
                  ) : (
                    <span className="flex size-12 items-center justify-center rounded-full bg-muted font-wenkai text-lg">
                      {friend.name.slice(0, 1)}
                    </span>
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-wenkai text-lg leading-tight text-foreground group-hover:text-ink" title={friend.name}>
                    {friend.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground/80">{hostOf(friend.url)}</p>
                </div>
              </div>
              <p className="line-clamp-2 min-h-[2.5rem] text-sm leading-5 text-muted-foreground">
                {friend.description || m.friends_no_description()}
              </p>
            </FriendPreviewLink>

            {friend.latest && (
              <a
                href={friend.latest.link}
                target="_blank"
                rel="noopener noreferrer"
                className="relative flex items-baseline gap-2 border-t border-dashed border-rule px-4 py-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <span className="shrink-0 font-wenkai text-ink/80">{m.friends_latest()}</span>
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
          </li>
        )
      })}
    </ul>
  )
}
