import { createFileRoute, notFound, Link } from '@tanstack/react-router'
import { getCachedTopic } from '@/lib/isr/topic'
import { BackToTopFAB } from '@/components/fab'
import { pageHead } from '@/lib/seo'
import { TopicNotesList } from './-components/topic-notes-list'
import { pageShellClass } from '@/components/layout/page-shell'
import { ListHeader } from '@/components/layout/list-parts'
import { m } from '#/paraglide/messages'
import { currentContentLocale } from '@/lib/content-locale'
import { anchorTitleStyle, rememberAnchor } from '@/lib/page-transition'
import { useEffect } from 'react'

export const Route = createFileRoute('/_layout/notes/topics/$slug')({
  loader: async ({ params }) => {
    const data = await getCachedTopic({ data: { slug: params.slug, locale: currentContentLocale() } })
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
  const { slug } = Route.useParams()
  // 回到專欄總表時，標題要移回這一個專欄那一格
  useEffect(() => rememberAnchor(`/notes/topics/${slug}`), [slug])

  return (
    <>
      <div className={pageShellClass}>
        <ListHeader
          eyebrow={
            <Link to="/notes/topics" className="transition-colors hover:text-zhu">
              {m.page_topics_title()}
            </Link>
          }
          title={topic.name}
          titleStyle={anchorTitleStyle(`/notes/topics/${slug}`)}
        >
          {topic.introduce && <p className="text-base text-ink-2">{topic.introduce}</p>}
          {topic.description && <p className="mt-1.5">{topic.description}</p>}
          <p className="mt-1.5 tabular-nums">{m.notes_total({ count: String(notes.length) })}</p>
        </ListHeader>

        {notes.length === 0 ? (
          <p className="py-16 text-center font-display text-ink-3">{m.topic_notes_empty()}</p>
        ) : (
          <TopicNotesList notes={notes} />
        )}
      </div>
      <BackToTopFAB />
    </>
  )
}
