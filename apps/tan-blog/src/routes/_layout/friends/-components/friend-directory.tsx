'use client'

import { useMemo, useState } from 'react'
import { SearchIcon, ShuffleIcon } from 'lucide-react'
import { Button } from '@sao-blog/ui/components/button'
import { Input } from '@sao-blog/ui/components/input'
import { m } from '#/paraglide/messages'
import { FriendGrid, type FriendItem } from './friend-grid'

// 友鏈名單：分組 + 搜尋。朋友少時不顯示搜尋框與分組目錄，避免畫面太囉嗦
const SEARCH_THRESHOLD = 12

const groupLabel = (group: string) => (group === 'friend' ? m.friends_group_friend() : group)

/** 依 group 分組，保留後端排序（group → sortOrder） */
function groupFriends(items: FriendItem[]) {
  const groups = new Map<string, FriendItem[]>()
  for (const item of items) {
    const list = groups.get(item.group)
    if (list) list.push(item)
    else groups.set(item.group, [item])
  }
  return [...groups]
}

export function FriendDirectory({ friends }: { friends: FriendItem[] }) {
  const [query, setQuery] = useState('')

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matched = q
      ? friends.filter((f) => [f.name, f.description ?? '', f.url].some((s) => s.toLowerCase().includes(q)))
      : friends
    return groupFriends(matched)
  }, [friends, query])

  const allGroups = useMemo(() => groupFriends(friends), [friends])
  const showTools = friends.length > SEARCH_THRESHOLD
  const showGroupNames = allGroups.length > 1

  // 隨機拜訪：在新分頁開一位朋友的首頁
  const visitRandom = () => {
    const pick = friends[Math.floor(Math.random() * friends.length)]
    if (pick) window.open(pick.url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div>
      {friends.length > 1 && (
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          {showGroupNames ? (
            <nav className="flex flex-wrap gap-1.5 font-wenkai text-sm">
              {allGroups.map(([group, items]) => (
                <a
                  key={group}
                  href={`#group-${encodeURIComponent(group)}`}
                  title={groupLabel(group)}
                  className="flex max-w-[12rem] items-center rounded-full border border-rule px-3 py-1 text-muted-foreground transition-colors hover:border-ink/40 hover:text-foreground"
                >
                  <span className="truncate">{groupLabel(group)}</span>
                  <span className="ml-1.5 shrink-0 tabular-nums text-xs">{items.length}</span>
                </a>
              ))}
            </nav>
          ) : (
            <span />
          )}
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="outline" size="sm" onClick={visitRandom} className="font-wenkai">
              <ShuffleIcon data-icon="inline-start" />
              {m.friends_random()}
            </Button>
            {showTools && (
            <label className="relative sm:w-56">
              <span className="sr-only">{m.friends_search()}</span>
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={query}
                placeholder={m.friends_search()}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </label>
            )}
          </div>
        </div>
      )}

      {groups.length === 0 ? (
        <p className="my-12 text-center font-wenkai text-muted-foreground">{m.friends_no_match()}</p>
      ) : (
        <div className="space-y-12">
          {groups.map(([group, items], i) => (
            <section key={group} id={`group-${encodeURIComponent(group)}`} className="scroll-mt-28">
              {showGroupNames && (
                <h2 className="mb-4 flex items-baseline gap-2 font-wenkai text-xl text-foreground">
                  {groupLabel(group)}
                  <span className="text-sm text-muted-foreground tabular-nums">{items.length}</span>
                </h2>
              )}
              <FriendGrid items={items} offering={!query && i === groups.length - 1} />
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
