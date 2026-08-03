import { createFileRoute } from '@tanstack/react-router'
import { client } from '@/lib/orpc'
import type { NoteItem } from '@/types/note'
import { compileMdx } from '@/lib/mdx/compile'
import { MdxContent } from '@/lib/mdx/mdx-content'
import { defaultMDXComponents } from '@/components/mdx'
import { pageHead } from '@/lib/seo'
import { m } from '#/paraglide/messages'
import { NotePreviewCard } from './-components/note-preview-card'
import { NoteListEntry } from './-components/note-list-entry'
import type { NoteListItem } from './-components/note-list-entry'

type NotesHomeData = {
  current: NoteItem | null
  list: NoteListItem[]
}

export const Route = createFileRoute('/_layout/notes/')({
  loader: async () => {
    const res = await client.note.getNotes({}).catch((err) => {
      console.error('Failed to fetch notes:', err)
      return null
    })
    const data = (res?.data ?? null) as NotesHomeData | null
    if (!data?.current) return { data, compiledSource: null }
    // 只有目前這篇（首頁精選）需要完整渲染 MDX，earlier list 只是連結/摘要。
    const mdx = await compileMdx({
      data: { source: data.current.content, variant: 'basic' },
    })
    return { data, compiledSource: mdx.compiledSource }
  },
  head: () => pageHead({
    title: m.page_notes_title(),
    description: m.page_notes_description(),
    path: '/notes',
  }),
  headers: () => ({
    'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=600',
  }),
  component: NotesIndexPage,
})

function NotesIndexPage() {
  const loaderData = Route.useLoaderData()
  const data = loaderData?.data ?? null
  const compiledSource = loaderData?.compiledSource ?? null
  const current = data?.current ?? null

  if (!current || !compiledSource) {
    return (
      <div className="container mx-auto flex min-h-[calc(100vh-80px)] items-center justify-center text-center">
        <div>
          <h1 className="text-2xl font-bold">還沒有任何日記</h1>
          <p className="mt-2 text-muted-foreground">
            目前沒有任何日記，或無法連線至伺服器。請稍後再試。
          </p>
        </div>
      </div>
    )
  }

  const earlier = (data?.list ?? []).filter((note) => note.id !== current.id)

  return (
    <div className="mx-auto mt-24 min-w-0 max-w-5xl px-4">
      <NotePreviewCard note={{ ...current, topic: current.topic ?? null }}>
        <MdxContent compiledSource={compiledSource} components={defaultMDXComponents} />
      </NotePreviewCard>
      {earlier.length > 0 && (
        <div className="mt-16">
          <p className="mb-8 text-center text-sm tracking-widest text-muted-foreground uppercase">
            更早的手記
          </p>
          <ul className="space-y-6">
            {earlier.map((note) => (
              <NoteListEntry key={note.id} note={note} />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
