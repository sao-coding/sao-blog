import { Link, createFileRoute } from '@tanstack/react-router'
import { orpc } from '@/lib/orpc'
import { BackToTopFAB } from '@/components/fab'
import { pageHead } from '@/lib/seo'
import { m } from '#/paraglide/messages'
import { TopicGrid } from './-components/topic-grid'
import { pageShellClass } from '@/components/layout/page-shell'
import { ListHeader } from '@/components/layout/list-parts'

export const Route = createFileRoute('/_layout/notes/topics/')({
  loader: async ({ context }) => {
    const res = await context.queryClient.ensureQueryData(
      orpc.topic.getTopics.queryOptions()
    )
    return res
  },
  head: () => pageHead({
    title: m.page_topics_title(),
    description: m.page_topics_description(),
    path: '/notes/topics',
  }),
  headers: () => ({
    'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
  }),
  component: NoteTopicsIndexPage,
})

function NoteTopicsIndexPage() {
  const data = Route.useLoaderData()

  if (!data || data.status === 'error') {
    return <p className="mt-40 text-center font-display text-ink-3">{m.posts_load_failed()}</p>
  }

  const topicList = data.data

  return (
    <>
      <div className={pageShellClass}>
        <ListHeader
          eyebrow={
            <Link to="/notes" className="transition-colors hover:text-zhu">
              {m.page_notes_title()}
            </Link>
          }
          title={m.page_topics_title()}
        >
          {m.topics_count({ count: String(topicList.length) })}
        </ListHeader>

        {topicList.length === 0 ? (
          <p className="py-20 text-center font-display text-xl text-ink-3">{m.topics_empty()}</p>
        ) : (
          <TopicGrid topics={topicList} />
        )}
      </div>
      <BackToTopFAB />
    </>
  )
}
