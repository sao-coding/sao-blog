import { createFileRoute, Link } from '@tanstack/react-router'
import { z } from 'zod'
import { client } from '@/lib/orpc'
import { BackToTopFAB } from '@/components/fab'
import { pageHead } from '@/lib/seo'
import { m } from '#/paraglide/messages'
import { pageShellClass } from '@/components/layout/page-shell'
import { GardenLayer } from '@/components/garden/garden-layer'
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
      <GardenLayer stones={false} scene="stepping-stones" />
      <div className={pageShellClass}>
        <header className="mb-10 sm:mb-12">
          <h1 className="font-wenkai text-4xl text-foreground">{m.page_fcircle_title()}</h1>
          <p className="mt-3 max-w-xl font-wenkai text-sm leading-relaxed text-muted-foreground">
            {circle
              ? m.fcircle_intro({ friends: circle.stats.friends_num, articles: circle.stats.article_num })
              : m.page_fcircle_description()}
          </p>
          <nav className="mt-5 font-wenkai text-sm">
            <Link to="/friends" className="text-ink underline-offset-4 hover:underline">
              {m.fcircle_link_friends()} →
            </Link>
          </nav>
        </header>

        {!circle || circle.articles.length === 0 ? (
          <p className="my-20 text-center font-wenkai text-xl text-muted-foreground">{m.fcircle_empty()}</p>
        ) : (
          <CircleFeed data={circle} author={author} />
        )}
      </div>
      <BackToTopFAB />
    </>
  )
}
