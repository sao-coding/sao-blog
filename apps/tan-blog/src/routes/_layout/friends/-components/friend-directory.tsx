'use client'

import { useMemo, useState } from 'react'
import { m } from '#/paraglide/messages'
import { FriendList, type FriendItem } from './friend-list'

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

  return (
    <div>
      {(showGroupNames || showTools) && (
        <div className="mb-8 flex flex-col gap-3 font-display text-sm sm:flex-row sm:items-baseline sm:justify-between">
          {showGroupNames ? (
            <nav className="flex flex-wrap gap-x-4 gap-y-1">
              {allGroups.map(([group, items]) => (
                <a key={group} href={`#group-${encodeURIComponent(group)}`} className="text-ink-2 transition-colors hover:text-zhu">
                  {groupLabel(group)}
                  <span className="ml-1 text-xs text-ink-3 tabular-nums">{items.length}</span>
                </a>
              ))}
            </nav>
          ) : (
            <span />
          )}
          {showTools && (
            <label className="sm:w-56">
              <span className="sr-only">{m.friends_search()}</span>
              <input
                type="search"
                value={query}
                placeholder={m.friends_search()}
                onChange={(e) => setQuery(e.target.value)}
                className="ink-field"
              />
            </label>
          )}
        </div>
      )}

      {groups.length === 0 ? (
        <p className="my-12 text-center font-display text-ink-3">{m.friends_no_match()}</p>
      ) : (
        <div className="space-y-20">
          {groups.map(([group, items], i) => (
            <section key={group} id={`group-${encodeURIComponent(group)}`} className="scroll-mt-28">
              {showGroupNames && (
                <h2 data-enter className="mb-10 flex items-baseline gap-2 font-display text-xl text-ink-1">
                  {groupLabel(group)}
                  <span className="text-sm text-ink-3 tabular-nums">{items.length}</span>
                </h2>
              )}
              <FriendList items={items} group={group} apply={!query && i === groups.length - 1} />
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
