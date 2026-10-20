import { createFileRoute, notFound } from '@tanstack/react-router'
import { getCachedNote } from '@/lib/isr/note'
import { CompiledMdx } from '@/lib/mdx/compiled-mdx'
import { blogPostingJsonLd, pageHead } from '@/lib/seo'
import { noteOgImagePath } from '@/lib/og/og-url'
import { mdxToPlainText } from '@/lib/plain-text'
import { NoteLeftSidebar } from './-components/note-left-sidebar'
import { NoteClientPage } from './-components/note-client-page'
import { ContentLocaleNotice } from '@/components/content-locale-notice'
import { currentContentLocale, toUiLocale } from '@/lib/content-locale'

export const Route = createFileRoute('/_layout/notes/$id')({
  loader: async ({ params }) => {
    // 語系在 loader 算好再傳進 server fn（server fn 的 RPC 網址沒有語系前綴）
    const data = await getCachedNote({ data: { id: params.id, locale: currentContentLocale() } })
    if (!data) {
      throw notFound()
    }
    return data
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return {}
    const description = mdxToPlainText(loaderData.content, 150)
    const publishedTime = loaderData.createdAt.toISOString()
    const modifiedTime = loaderData.updatedAt.toISOString()
    const path = `/notes/${params.id}`
    const image = noteOgImagePath(params.id)

    return {
      ...pageHead({
        title: loaderData.title,
        description,
        path,
        type: 'article',
        image,
        publishedTime,
        modifiedTime,
        contentLocales: (loaderData.availableLocales ?? []).map(toUiLocale),
      }),
      scripts: [
        blogPostingJsonLd({
          title: loaderData.title,
          description,
          path,
          image,
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
  const { id } = Route.useParams()

  return (
    // 比照 innei.in 日記頁：日記卡片 778px 置中，左（其他日記）右（目錄）側欄放在兩旁
    <div className="mx-auto mt-12 grid w-full max-w-[778px] gap-4 xl:max-w-[calc(778px+400px)] xl:grid-cols-[1fr_minmax(0,778px)_1fr]">
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
        <ContentLocaleNotice
          path={`/notes/${id}`}
          isFallback={note.isFallback}
          translatedBy={note.translatedBy}
          availableLocales={note.availableLocales}
        />
        <CompiledMdx compiled={note.compiled} />
      </NoteClientPage>
    </div>
  )
}
