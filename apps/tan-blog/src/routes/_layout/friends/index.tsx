import { createFileRoute, Link } from '@tanstack/react-router'
import { client } from '@/lib/orpc'
import { BackToTopFAB } from '@/components/fab'
import { pageHead } from '@/lib/seo'
import { m } from '#/paraglide/messages'
import { pageShellClass } from '@/components/layout/page-shell'
import { ListHeader } from '@/components/layout/list-parts'
import { FriendDirectory } from './-components/friend-directory'
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

function FriendsPage() {
  const data = Route.useLoaderData()
  const friends = data?.data ?? []

  // 隨機拜訪：在新分頁開一位朋友的首頁
  const visitRandom = () => {
    const pick = friends[Math.floor(Math.random() * friends.length)]
    if (pick) window.open(pick.url, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      <div className={pageShellClass}>
        {/* 友鏈是一區的首頁：區名寫在右上墨點旁（DESIGN.md 第 6 節），h1 只給螢幕閱讀器 */}
        <ListHeader title={m.page_friends_title()} titleInNav>
          <p>
            <span className="mr-1.5 text-ink-1 tabular-nums">{friends.length}</span>
            {m.friends_intro()}
          </p>
          {/* 三個去處：朋友們最近寫了什麼、隨機拜訪一位、申請表單 */}
          <nav className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-ink-2">
            <Link to="/fcircle" className="transition-colors hover:text-zhu">
              {m.friends_link_circle()} →
            </Link>
            {friends.length > 1 && (
              <button type="button" onClick={visitRandom} className="cursor-pointer transition-colors hover:text-zhu">
                {m.friends_random()} ↗
              </button>
            )}
            <a href="#apply" className="transition-colors hover:text-zhu">
              {m.friends_apply_jump()} ↓
            </a>
          </nav>
        </ListHeader>

        {friends.length === 0 ? (
          <p className="my-20 text-center font-display text-xl text-ink-3">{m.friends_empty()}</p>
        ) : (
          <FriendDirectory friends={friends} />
        )}

        <FriendApplyForm />
      </div>
      <BackToTopFAB />
    </>
  )
}
