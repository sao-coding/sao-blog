import { createFileRoute, notFound, Link } from '@tanstack/react-router'
import { getCachedTopic } from '@/lib/isr/topic'
import { BackToTopFAB } from '@/components/fab'
import { pageHead } from '@/lib/seo'
import { TopicNotesList } from './-components/topic-notes-list'

export const Route = createFileRoute('/_layout/notes/topics/$slug')({
  loader: async ({ params }) => {
    const data = await getCachedTopic({ data: params.slug })
    if (!data) {
      throw notFound()
    }
    return data
  },
  head: ({ loaderData, params }) =>
    loaderData
      ? pageHead({
          title: loaderData.topic.name,
          description: loaderData.topic.introduce || loaderData.topic.description || undefined,
          path: `/notes/topics/${params.slug}`,
          alternates: false,
        })
      : {},
  headers: () => ({
    'Cache-Control': 'public, max-age=30, must-revalidate',
  }),
  component: NoteTopicDetailPage,
})

function NoteTopicDetailPage() {
  const { topic, notes } = Route.useLoaderData()

  return (
    <>
      <div className="mx-auto mt-14 max-w-3xl px-4 lg:mt-[80px] lg:px-0 2xl:max-w-4xl">
        <header className="mb-12">
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/notes/topics" className="hover:text-foreground transition-colors">
              專欄
            </Link>
            <span>/</span>
            <span className="text-foreground">{topic.name}</span>
          </div>

          <div className="flex items-start gap-4">
            {topic.color && (
              <span
                className="mt-2 size-3 shrink-0 rounded-full"
                style={{ backgroundColor: topic.color }}
              />
            )}
            <div>
              <h1 className="text-[3rem] leading-none font-extralight tracking-tighter text-neutral-10/80 mb-3">
                {topic.name}
              </h1>
              <p className="text-muted-foreground">{topic.introduce}</p>
              {topic.description && (
                <p className="mt-2 text-sm text-muted-foreground/70">{topic.description}</p>
              )}
              <p className="mt-3 text-sm text-muted-foreground">
                <span className="tabular-nums font-light text-foreground">{notes.length}</span>{' '}
                篇筆記
              </p>
            </div>
          </div>
        </header>

        <div className="relative ml-1 border-l-2">
          {notes.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground pl-6">尚無筆記</div>
          ) : (
            <TopicNotesList notes={notes} />
          )}
        </div>
      </div>
      <BackToTopFAB />
    </>
  )
}
