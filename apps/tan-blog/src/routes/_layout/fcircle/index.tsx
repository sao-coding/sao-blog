import { createFileRoute, Link } from '@tanstack/react-router'
import { z } from 'zod'
import dayjs from 'dayjs'
import { client } from '@/lib/orpc'
import { BackToTopFAB } from '@/components/fab'
import { pageHead } from '@/lib/seo'
import { m } from '#/paraglide/messages'
import { pageShellClass } from '@/components/layout/page-shell'
import { ListHeader } from '@/components/layout/list-parts'
import { CircleFeed } from './-components/circle-feed'

const searchSchema = z.object({
  /** 只看某位朋友（對應文章的 author） */
  author: z.string().max(100).optional(),
})

export const Route = createFileRoute('/_layout/fcircle/')({
  validateSearch: searchSchema,
  loader: async () => {
    const data = await client.friend.getCircle().catch((err) => {
      console.error('Failed to fetch friend circle:', err)
      return null
    })
    return data
  },
  head: () => pageHead({
    title: m.page_fcircle_title(),
    description: m.page_fcircle_description(),
    path: '/fcircle',
  }),
  headers: () => ({
    'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
  }),
  component: FriendCirclePage,
})

function FriendCirclePage() {
  const data = Route.useLoaderData()
  const { author } = Route.useSearch()
  const circle = data?.data

  return (
    <>
      <div className={pageShellClass}>
        {/* 朋友圈是友鏈的子頁：自己的標題，上面小字回友鏈 */}
        <ListHeader
          eyebrow={
            <Link to="/friends" className="transition-colors hover:text-zhu">
              {m.page_friends_title()}
            </Link>
          }
          title={m.page_fcircle_title()}
        >
          <p>
            {circle
              ? m.fcircle_intro({ friends: circle.stats.friends_num, articles: circle.stats.article_num })
              : m.page_fcircle_description()}
          </p>
          {circle && <p className="mt-1 text-xs">{m.fcircle_updated({ time: dayjs(circle.generated_at).format('YYYY-MM-DD HH:mm') })}</p>}
        </ListHeader>

        {!circle || circle.articles.length === 0 ? (
          <p className="my-20 text-center font-display text-xl text-ink-3">{m.fcircle_empty()}</p>
        ) : (
          <CircleFeed data={circle} author={author} />
        )}
      </div>
      <BackToTopFAB />
    </>
  )
}
