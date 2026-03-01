// src/app/(blog)/notes/[id]/page.tsx
import { evaluate } from 'next-mdx-remote-client/rsc'
import { Metadata } from 'next'
import { ErrorComponent } from '@/components/index'
import { NoteItem } from '@/types/note'
import { ApiResponse } from '@/types/api'
import { getBasicMdxOptions } from '@/components/mdx/parsers'
import { components } from '@/components/mdx/mdx-renderer'
import { NoteClientPage } from './_components/note-client-page'
import { TocItem } from '@/types/toc'

type Scope = {
  readingTime: string
  toc?: TocItem[]
}

type Frontmatter = {
  title: string
  description?: string
  keywords?: string
  author: string
  date?: string
  showToc?: boolean
}
// 獲取日記資料的函式
const getNoteData = async (id: string): Promise<ApiResponse<NoteItem>> => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/notes/${id}`
  )
  if (!res.ok) {
    // 這裡可以根據 status code 做更細緻的錯誤處理，例如 404
    throw new Error('Failed to fetch note data')
  }
  return res.json()
}

// 動態生成頁面標題
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  try {
    const { id } = await params
    const { data: note } = await getNoteData(id)
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
  let noteData: ApiResponse<NoteItem>

  try {
    noteData = await getNoteData(id)
  } catch {
    return <ErrorComponent error="讀取日記時發生錯誤！" />
  }

  const note = noteData.data
  const source = note.content

  if (!source || typeof source !== 'string') {
    return <ErrorComponent error="找不到日記內容或格式錯誤！" />
  }

  const { content, frontmatter, scope, error } = await evaluate<
    Frontmatter,
    Scope
  >({
    source,
    options: getBasicMdxOptions(source),
    components: components,
  })

  if (error) {
    return <ErrorComponent error={error.message} />
  }

  const toc = scope.toc || []

  return (
    <NoteClientPage note={note} toc={toc}>
      {content}
    </NoteClientPage>
  )
}
