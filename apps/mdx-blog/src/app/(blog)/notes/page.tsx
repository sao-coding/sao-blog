// src/app/(blog)/notes/page.tsx
import { client } from '@/lib/orpc'
import { ErrorComponent } from '@/components/index'
import { NotePreviewCard } from './_components/note-preview-card'
import { NoteListEntry } from './_components/note-list-entry'
import { evaluateNoteContent } from './_lib/evaluate-note'
import type { NotesHomeData } from './_types'

export const revalidate = 60

export default async function NotesPage() {
  const res = await client.note.getNotes({}).catch((err) => {
    console.error('Failed to fetch notes:', err)
    return null
  })

  const data = (res?.data ?? null) as NotesHomeData | null
  const current = data?.current ?? null

  if (!current) {
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

  const source = current.content
  if (!source || typeof source !== 'string') {
    return <ErrorComponent error="找不到日記內容或格式錯誤！" />
  }

  const { content, error } = await evaluateNoteContent(source)

  if (error) {
    return <ErrorComponent error={error.message} />
  }

  const earlier = (data?.list ?? []).filter((note) => note.id !== current.id)

  return (
    <div className='mx-auto mt-24 min-w-0 max-w-5xl px-4'>
      <NotePreviewCard note={{ ...current, topic: current.topic ?? null }}>
        {content}
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
