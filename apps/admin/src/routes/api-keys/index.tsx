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
      actions={
        <Button onClick={openCreateApiKeyDialog} className="gap-2">
          <PlusIcon className="size-4" />
          建立金鑰
        </Button>
      }
    >
      <div>
        {status === 'pending' ? (
          <div className="flex h-64 items-center justify-center">
            <span className="text-muted-foreground">載入中...</span>
          </div>
        ) : (
          <DataTableContainer
            columns={columns}
            data={apiKeys || []}
            searchColumnId="name"
          />
        )}
      </div>
    </AdminShell>
  )
}
