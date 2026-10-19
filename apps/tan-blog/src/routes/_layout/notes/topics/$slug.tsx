import { createFileRoute, notFound, Link } from '@tanstack/react-router'
import { getCachedTopic } from '@/lib/isr/topic'
import { BackToTopFAB } from '@/components/fab'
import { pageHead } from '@/lib/seo'
import { TopicNotesList } from './-components/topic-notes-list'
import { pageShellClass } from '@/components/layout/page-shell'

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
      <div className={pageShellClass}>
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
              <h1 className="mb-3 font-wenkai text-4xl text-foreground">
                {topic.name}
              </h1>
              <p className="font-wenkai text-muted-foreground">{topic.introduce}</p>
              {topic.description && (
                <p className="mt-2 text-sm text-muted-foreground/70">{topic.description}</p>
              )}
              <p className="mt-3 flex items-baseline gap-1.5 font-wenkai text-sm text-muted-foreground">
                共<span className="text-2xl leading-none text-ink tabular-nums">{notes.length}</span>篇筆記
              </p>
            </div>
          </div>
        </header>

        <div className="relative ml-1 border-l border-rule">
          {notes.length === 0 ? (
            <div className="py-16 pl-6 text-center font-wenkai text-muted-foreground">尚無筆記</div>
          ) : (
            <TopicNotesList notes={notes} />
          )}
        </div>
      </div>
      <BackToTopFAB />
    </>
  )
}
