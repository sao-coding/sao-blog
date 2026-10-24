import { createFileRoute } from '@tanstack/react-router'
import { client } from '@/lib/orpc'
import { BackToTopFAB } from '@/components/fab'
import { pageHead } from '@/lib/seo'
import { m } from '#/paraglide/messages'
import { pageShellClass } from '@/components/layout/page-shell'
import { FriendGrid, type FriendItem } from './-components/friend-grid'
import { FriendApplyForm } from './-components/friend-apply-form'

export const Route = createFileRoute('/_layout/friends/')({
  loader: async () => {
    const data = await client.friend.getFriends().catch((err) => {
      console.error('Failed to fetch friends:', err)
      return null
    })
    return data
  },
  head: () => pageHead({
    title: m.page_friends_title(),
    description: m.page_friends_description(),
    path: '/friends',
  }),
  headers: () => ({
    'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
  }),
  component: FriendsPage,
})

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

function FriendsPage() {
  const data = Route.useLoaderData()
  const friends = data?.data ?? []
  const groups = groupFriends(friends)

  return (
    <>
      <div className={pageShellClass}>
        <header className="mb-10 max-w-xl sm:mb-14">
          <h1 className="font-wenkai text-4xl text-foreground">{m.page_friends_title()}</h1>
          <p className="mt-3 font-wenkai text-sm leading-relaxed text-muted-foreground">
            <span className="mr-1.5 font-mono text-ink tabular-nums">{friends.length}</span>
            {m.friends_intro()}
          </p>
        </header>

        {friends.length === 0 ? (
          <p className="my-20 text-center font-wenkai text-xl text-muted-foreground">{m.friends_empty()}</p>
        ) : (
          <div className="space-y-12">
            {groups.map(([group, items]) => (
              <section key={group}>
                {/* 只有一組時不顯示組名 */}
                {groups.length > 1 && (
                  <h2 className="mb-5 font-wenkai text-xl text-foreground">
                    {group === 'friend' ? m.friends_group_friend() : group}
                  </h2>
                )}
                <FriendGrid items={items} />
              </section>
            ))}
          </div>
        )}

        <FriendApplyForm />
      </div>
      <BackToTopFAB />
    </>
  )
}
