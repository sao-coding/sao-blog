import type { InferClientOutputs } from '@orpc/client'
import type { client } from '@/lib/orpc'

type RouterOutputs = InferClientOutputs<typeof client>
export type FriendItem = RouterOutputs['friend']['getFriends']['data'][number]

export function FriendGrid({ items }: { items: FriendItem[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((friend) => (
        <li key={friend.id}>
          <a
            href={friend.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex h-full items-center gap-3 rounded-xl border border-rule bg-card/60 p-3 transition-colors hover:border-ink/40 hover:bg-card"
          >
            {friend.avatar ? (
              <img
                src={friend.avatar}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
                className="size-12 shrink-0 rounded-full border border-rule object-cover transition-transform group-hover:rotate-6"
              />
            ) : (
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full border border-rule bg-muted font-wenkai text-lg">
                {friend.name.slice(0, 1)}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate font-wenkai text-base text-foreground group-hover:text-ink">{friend.name}</p>
              {friend.description && (
                <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{friend.description}</p>
              )}
            </div>
          </a>
        </li>
      ))}
    </ul>
  )
}
