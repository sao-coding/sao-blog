import { createFileRoute } from '@tanstack/react-router'
import { client } from '@/lib/orpc'
import type { NoteItem } from '@/types/note'
import { compileMdx } from '@/lib/mdx/compile'
import { CompiledMdx } from '@/lib/mdx/compiled-mdx'
import { pageHead } from '@/lib/seo'
import { m } from '#/paraglide/messages'
import { PageWithSidebar } from '@/components/layout/page-shell'
import { NotePreviewCard } from './-components/note-preview-card'
import { NotesJournal, type JournalNote } from './-components/notes-journal'
import { NotesCalendar } from './-components/notes-calendar'

type NotesHomeData = {
  current: NoteItem | null
  // 最新 9 篇（附摘要），用來替日記本裡的這幾篇補上摘要與書籤
  list: { id: string; excerpt: string; bookmark: boolean }[]
}

export const Route = createFileRoute('/_layout/notes/')({
  loader: async () => {
    // 首頁精選（最新一篇全文＋最新 9 篇摘要）與所有日記的日期清單（日記本、寫作足跡用）並行取得
    const [home, timeline] = await Promise.all([
      client.note.getNotes({}).catch((err) => {
        console.error('Failed to fetch notes:', err)
        return null
      }),
      client.timeline.getTimeLine({ type: 'note' }).catch((err) => {
        console.error('Failed to fetch note timeline:', err)
        return null
      }),
    ])
    const data = (home?.data ?? null) as NotesHomeData | null
    const all = (timeline?.data ?? []).flatMap((year) => year.items)
    if (!data?.current) return { data, all, compiled: null }
    // 只有最新一篇需要渲染 MDX，其餘只顯示標題與摘要
    const mdx = await compileMdx({
      data: { source: data.current.content, variant: 'basic' },
    })
    return { data, all, compiled: mdx.compiled }
  },
  head: () =>
    pageHead({
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
  const { data, all, compiled } = Route.useLoaderData()
  const current = data?.current ?? null

  if (!current || !compiled) {
    return (
      <div className="container mx-auto flex min-h-[calc(100vh-80px)] items-center justify-center text-center">
        <div>
          <h1 className="font-wenkai text-2xl">{m.notes_empty()}</h1>
          <p className="mt-2 text-muted-foreground">{m.notes_empty_hint()}</p>
        </div>
      </div>
    )
  }

  // 所有日記（新→舊），補上最新幾篇才有的摘要與書籤；最新一篇已在上方展開，不重複列出
  const extra = new Map((data?.list ?? []).map((item) => [item.id, item]))
  const journal: JournalNote[] = all
    .map((note) => ({ ...note, excerpt: extra.get(note.id)?.excerpt, bookmark: extra.get(note.id)?.bookmark }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const earlier = journal.filter((note) => note.id !== current.id)

  return (
    <PageWithSidebar sidebar={<NotesCalendar notes={journal} />}>
      <header className="mb-12">
        <h1 className="font-wenkai text-4xl text-foreground">{m.page_notes_title()}</h1>
        <p className="mt-3 font-wenkai text-sm text-muted-foreground">
          <span className="mr-2 font-mono text-ink tabular-nums">{m.notes_total({ count: String(journal.length) })}</span>
          {m.notes_subtitle()}
        </p>
      </header>

      <NotePreviewCard note={{ ...current, topic: current.topic ?? null }}>
        <CompiledMdx compiled={compiled} />
      </NotePreviewCard>

      {earlier.length > 0 && (
        <div className="mt-16">
          <NotesJournal notes={earlier} />
        </div>
      )}
    </PageWithSidebar>
  )
}
