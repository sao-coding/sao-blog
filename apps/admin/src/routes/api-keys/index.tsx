import { columns } from '@/components/api-keys/columns'
import { ApiKeyForm } from '@/components/api-keys/api-key-form'
import { apiKeysQueryOptions } from '@/components/api-keys/use-api-keys'
import AdminShell from '@/components/layout/admin-shell'
import { DataTableContainer } from '@/components/table/table'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useOverlay } from '@/hooks/use-overlay'
import { Button } from '@sao-blog/ui/components/button'
import { PlusIcon } from 'lucide-react'

export const Route = createFileRoute('/api-keys/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { openDialog } = useOverlay()
  const { data: apiKeys, status } = useQuery(apiKeysQueryOptions())

  const openCreateApiKeyDialog = () => {
    openDialog({
      id: 'create-api-key',
      render: ({ close }) => ({
        title: '建立 API 金鑰',
        description: '建立後請立即保存金鑰，僅會顯示一次。',
        body: <ApiKeyForm onSuccess={close} onCancel={close} />,
        hideCancel: true,
        hideConfirm: true,
      }),
    })
  }

  return (
    <AdminShell
      title="API 金鑰"
      description="給 MCP 與自動化工具使用的金鑰，建立後只會顯示一次。"
      actions={
        <Button onClick={openCreateApiKeyDialog} className="gap-2">
          <PlusIcon className="size-4" />
          建立金鑰
        </Button>
      }
    >
      <div>
        <DataTableContainer
            columns={columns}
            data={apiKeys || []}
            searchColumnId="name"
            isLoading={status === 'pending'}
          />
      </div>
    </AdminShell>
  )
}
