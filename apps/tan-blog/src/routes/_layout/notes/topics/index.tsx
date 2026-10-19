import { createFileRoute } from '@tanstack/react-router'
import { orpc } from '@/lib/orpc'
import { BackToTopFAB } from '@/components/fab'
import { pageHead } from '@/lib/seo'
import { m } from '#/paraglide/messages'
import { TopicGrid } from './-components/topic-grid'
import { pageShellClass } from '@/components/layout/page-shell'

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
    return <div className="mt-20 text-center text-muted-foreground">載入失敗</div>
  }

  const topicList = data.data

  return (
    <>
      <div className={pageShellClass}>
        <header className="mb-12">
          <h1 className="font-wenkai text-4xl text-foreground">專欄</h1>
          <p className="mt-3 flex items-baseline gap-1.5 font-wenkai text-sm text-muted-foreground">
            共
            <span className="text-2xl leading-none text-ink tabular-nums">{topicList.length}</span>
            個專欄
          </p>
        </header>

        {topicList.length === 0 ? (
          <div className="py-20 text-center font-wenkai text-xl text-muted-foreground">
            尚無專欄
          </div>
        ) : (
          <TopicGrid topics={topicList} />
        )}
      </div>
      <BackToTopFAB />
    </>
  )
}
