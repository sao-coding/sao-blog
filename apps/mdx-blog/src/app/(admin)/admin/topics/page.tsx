import AdminShell from '@/app/(admin)/_components/layout/admin-shell'
import { DataTableContainer } from '@/app/(admin)/_components/table/table'
import { columns } from './_components/table/topics-columns'
import { TopicFormDialog } from './_components/topic-form-dialog'
import { cookies } from 'next/headers'
import { TopicItem } from '@/types/topic'
import { ApiResponse } from '@/types/api'

const getTopics = async () => {
  const cookieStore = await cookies()
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/admin/topics`,
    {
      headers: {
        cookie: cookieStore.toString(),
      },
      next: {
        tags: ['topics'],
      },
    }
  )

  if (!response.ok) {
    // 處理 API 錯誤
    console.error('Failed to fetch topics:', await response.text())
    return []
  }

  const data = await response.json()
  console.log('Fetched topics data:', data)
  return data || []
}

export default async function TopicsPage() {
  const topics: ApiResponse<TopicItem[]> = await getTopics()

  return (
    <AdminShell title="專欄管理" actions={<TopicFormDialog mode="create" />}>
      <DataTableContainer
        columns={columns}
        data={topics.data}
        searchColumnId="name"
      />
    </AdminShell>
  )
}
