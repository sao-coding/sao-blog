import { createFileRoute } from '@tanstack/react-router'
import { orpc } from '@/lib/orpc'
import { BackToTopFAB } from '@/components/fab'
import { pageHead } from '@/lib/seo'
import { m } from '#/paraglide/messages'
import { TopicGrid } from './-components/topic-grid'

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
      <div className="mx-auto mt-14 max-w-3xl px-4 lg:mt-[80px] lg:px-0 2xl:max-w-4xl">
        <header className="mb-12">
          <h1 className="tracking-widest text-neutral-10/50 uppercase mb-3">
            專欄
          </h1>
          <div className="mb-2 flex items-baseline gap-4">
            <p className="text-[4.5rem] leading-none font-extralight tracking-tighter text-neutral-10/50">
              {topicList.length}
            </p>
            <span className="text-muted-foreground">個專欄</span>
          </div>
        </header>

        {topicList.length === 0 ? (
          <div className="text-center text-2xl font-semibold text-muted-foreground py-20">
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
