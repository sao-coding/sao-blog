// src/app/(blog)/notes/[id]/page.tsx
import { cache } from 'react'
import { Metadata } from 'next'
import { ErrorComponent } from '@/components/index'
import { NoteClientPage } from './_components/note-client-page'
import { evaluateNoteContent } from '../_lib/evaluate-note'
import { client } from '@/lib/orpc'

export const revalidate = 60

// build time 先把已發布日記的 id 烤成靜態頁（SSG）；
// 新日記沒被預生成也沒關係，dynamicParams 預設 true，
// 第一次請求即時渲染，渲染結果依 revalidate 快取（ISR fallback）。
export async function generateStaticParams() {
  try {
    const res = await client.note.getNoteIds()
    if (res.status !== 'success' || !res.data) return []
    return res.data.map((note) => ({ id: note.id }))
  } catch (err) {
    console.error('Failed to generate static params for notes:', err)
    return []
  }
}

// generateMetadata 跟 Page 在同一次請求都會呼叫，用 cache() 去重避免打兩次
const getNoteData = cache(async (id: string) => {
  const res = await client.note.getNote({ id })
  if (!res.data) {
    throw new Error('Note not found')
  }
  return res.data
})

// 動態生成頁面標題
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  try {
    const { id } = await params
    const note = await getNoteData(id)
    return {
      title: note.title,
      description: note.content.substring(0, 150), // 簡單取前 150 字當描述
    }
  } catch {
    return {
      title: '日記',
      description: '一篇日記',
    }
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  let note: Awaited<ReturnType<typeof getNoteData>>

  try {
    note = await getNoteData(id)
  } catch {
    return <ErrorComponent error="讀取日記時發生錯誤！" />
  }

  const source = note.content

  if (!source || typeof source !== 'string') {
    return <ErrorComponent error="找不到日記內容或格式錯誤！" />
  }

  const { content, scope, error } = await evaluateNoteContent(source)

  if (error) {
    return <ErrorComponent error={error.message} />
  }

  const toc = scope.toc || []

  return (
    <NoteClientPage
      note={{
        ...note,
        topic: null,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
      }}
      toc={toc}
    >
      {content}
    </NoteClientPage>
  )
}
