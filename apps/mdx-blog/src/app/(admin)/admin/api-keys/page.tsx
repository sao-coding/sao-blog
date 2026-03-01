import type { ApiResponse } from '@/types/api'
import { cookies } from 'next/headers'
import AdminShell from '../../_components/layout/admin-shell'
import { DataTableContainer } from '../../_components/table/table'
import { columns } from './_components/table/api-keys-columns'
import type { ApiKey } from '@/types/api-key'
import { Button } from '@/components/ui/button'
import CreateApiKey from './_components/create'

const getApiKeys = async () => {
  const cookieStore = await cookies()
  const url = `${process.env.NEXT_PUBLIC_API_URL}/auth/api-key/list`
  console.log('Fetching URL:', url)
  const res = await fetch(url, {
    headers: {
      cookie: cookieStore.toString(),
    },
    next: {
      tags: ['api-keys'], // 使用快取標籤
    },
  })
  console.log('Fetch response status:', res.status)
  if (!res.ok) {
    console.error('Failed to fetch API keys:', await res.text())
    return { data: [], meta: {} }
  }
  const apiKeys = await res.json()
  console.log('Fetched API keys:', apiKeys)
  return apiKeys
}

const ApiKeysPage = async () => {
  const apiKeys: ApiKey[] = await getApiKeys()

  return (
    <AdminShell title="API 金鑰" actions={<CreateApiKey />}>
      <DataTableContainer
        columns={columns}
        searchColumnId="name"
        data={apiKeys ?? []}
      />
    </AdminShell>
  )
}

export default ApiKeysPage
// FIXME: 表格資料快取問題
// TODO: 設定api-key 呼叫次數 目前每天只有 10 次
