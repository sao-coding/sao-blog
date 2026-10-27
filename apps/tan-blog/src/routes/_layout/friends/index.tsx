import { createFileRoute, Link } from '@tanstack/react-router'
import { client } from '@/lib/orpc'
import { BackToTopFAB } from '@/components/fab'
import { pageHead } from '@/lib/seo'
import { m } from '#/paraglide/messages'
import { pageShellClass } from '@/components/layout/page-shell'
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

  return (
    <>
      <div className={pageShellClass}>
        {/* 繪馬與繪馬掛共用的乾筆濾鏡（友鏈與奉納預覽都用） */}
        <svg aria-hidden className="absolute size-0">
          <filter id="ema-dry">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={7} />
            <feDisplacementMap in="SourceGraphic" scale="1.8" />
          </filter>
        </svg>
        <header className="mb-10 sm:mb-14">
          <h1 className="font-wenkai text-4xl text-foreground">{m.page_friends_title()}</h1>
          <p className="mt-3 max-w-xl font-wenkai text-sm leading-relaxed text-muted-foreground">
            <span className="mr-1.5 font-mono text-ink tabular-nums">{friends.length}</span>
            {m.friends_intro()}
          </p>
          {/* 兩個去處：看朋友們最近寫了什麼、或直接跳到申請表單 */}
          <nav className="mt-5 flex flex-wrap gap-x-5 gap-y-2 font-wenkai text-sm">
            <Link to="/fcircle" className="text-ink underline-offset-4 hover:underline">
              {m.friends_link_circle()} →
            </Link>
            <a href="#apply" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              {m.friends_apply_jump()} ↓
            </a>
          </nav>
        </header>

        {friends.length === 0 ? (
          <p className="my-20 text-center font-wenkai text-xl text-muted-foreground">{m.friends_empty()}</p>
        ) : (
          <FriendDirectory friends={friends} />
        )}

        <FriendApplyForm />
      </div>
      <BackToTopFAB />
    </>
  )
}
