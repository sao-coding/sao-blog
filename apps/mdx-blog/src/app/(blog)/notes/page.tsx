// src/app/(blog)/notes/page.tsx
import { redirect } from 'next/navigation'
import { ApiResponse } from '@/types/api'
import { NoteItem } from '@/types/note'

export const dynamic = 'force-dynamic'

// 此函式將在伺服器端執行
const getLatestNoteId = async (): Promise<string | null> => {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/notes/latest`,
      {
        cache: 'no-store', // 確保每次都獲取最新的日記
      }
    )

    if (!res.ok) {
      console.error('Failed to fetch latest note:', res.status)
      return null
    }

    const response: ApiResponse<NoteItem> = await res.json()

    if (response.status === 'success' && response.data?.id) {
      return response.data.id
    } else {
      console.error('API did not return a successful status or note ID.')
      return null
    }
  } catch (error) {
    console.error('An error occurred while fetching the latest note:', error)
    return null
  }
}

// 這是一個非同步的伺服器元件
export default async function NotesRedirectPage() {
  const latestNoteId = await getLatestNoteId()

  if (latestNoteId) {
    // 執行伺服器端重定向
    console.log('Redirecting to latest note with ID:', latestNoteId)
    redirect(`/notes/${latestNoteId}`)
  } else {
    // 如果無法獲取 ID，則顯示一個錯誤或備用頁面
    return (
      <div className="container mx-auto flex min-h-[calc(100vh-80px)] items-center justify-center text-center">
        <div>
          <h1 className="text-2xl font-bold">無法載入日記</h1>
          <p className="mt-2 text-muted-foreground">
            目前沒有任何日記，或無法連線至伺服器。請稍後再試。
          </p>
        </div>
      </div>
    )
  }
}
