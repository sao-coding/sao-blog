import { createFileRoute, notFound } from '@tanstack/react-router'
import { getCachedNote } from '@/lib/isr/note'
import { MdxContent } from '@/lib/mdx/mdx-content'
import { defaultMDXComponents } from '@/components/mdx'
import { blogPostingJsonLd, pageHead } from '@/lib/seo'
import { NoteLeftSidebar } from './-components/note-left-sidebar'
import { NoteClientPage } from './-components/note-client-page'

export const Route = createFileRoute('/_layout/notes/$id')({
  loader: async ({ params }) => {
    const data = await getCachedNote({ data: params.id })
    if (!data) {
      throw notFound()
    }
    return data
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return {}
    const description = loaderData.content.substring(0, 150)
    const publishedTime = loaderData.createdAt.toISOString()
    const modifiedTime = loaderData.updatedAt.toISOString()
    const path = `/notes/${params.id}`

    return {
      ...pageHead({
        title: loaderData.title,
        description,
        path,
        type: 'article',
        publishedTime,
        modifiedTime,
        alternates: false,
      }),
      scripts: [
        blogPostingJsonLd({
          title: loaderData.title,
          description,
          path,
          publishedTime,
          modifiedTime,
        }),
      ],
    }
  },
  headers: () => ({
    'Cache-Control': 'public, max-age=30, must-revalidate',
  }),
  component: NoteDetailPage,
})

function NoteDetailPage() {
  const note = Route.useLoaderData()

  return (
    <div className="grid max-w-[60rem] mt-12 mx-auto gap-4 xl:max-w-[calc(60rem+400px)] xl:grid-cols-[1fr_minmax(auto,60rem)_1fr] md:grid-cols-1">
      <NoteLeftSidebar className="relative hidden min-w-0 xl:block" />
      <NoteClientPage
        note={{
          ...note,
          topic: null,
          createdAt: note.createdAt.toISOString(),
          updatedAt: note.updatedAt.toISOString(),
        }}
        toc={note.toc}
      >
        <MdxContent compiledSource={note.compiledSource} components={defaultMDXComponents} />
      </NoteClientPage>
    </div>
  )
}
