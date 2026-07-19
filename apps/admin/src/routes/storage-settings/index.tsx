import { StorageConfigForm } from '@/components/storage/storage-config-form'
import { StorageConfigRowActions } from '@/components/storage/storage-config-row-actions'
import AdminShell from '@/components/layout/admin-shell'
import { orpc } from '@/utils/orpc'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useOverlay } from '@/hooks/use-overlay'
import { Button } from '@sao-blog/ui/components/button'
import { Badge } from '@sao-blog/ui/components/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@sao-blog/ui/components/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@sao-blog/ui/components/empty'
import { CloudIcon, PlusIcon } from 'lucide-react'

export const Route = createFileRoute('/storage-settings/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { openDialog } = useOverlay()
  const { data, status } = useQuery(orpc.admin.storageConfig.getConfigs.queryOptions())

  const openCreateDialog = () => {
    openDialog({
      id: 'create-storage-config',
      render: ({ close }) => ({
        title: '新增儲存設定',
        description: '填寫 S3 相容儲存空間（例如 RustFS）的連線資訊。',
        body: <StorageConfigForm mode="create" onSuccess={close} onCancel={close} />,
        hideCancel: true,
        hideConfirm: true,
      }),
    })
  }

  const configs = data?.data ?? []

  return (
    <AdminShell
      title="儲存設定"
      actions={
        <Button onClick={openCreateDialog} className="gap-2">
          <PlusIcon className="size-4" />
          新增設定
        </Button>
      }
    >
      {status === 'pending' ? (
        <div className="flex h-64 items-center justify-center">
          <span className="text-muted-foreground">載入中...</span>
        </div>
      ) : configs.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CloudIcon />
            </EmptyMedia>
            <EmptyTitle>尚未設定儲存空間</EmptyTitle>
            <EmptyDescription>
              新增一組 S3 相容儲存設定（例如 RustFS），才能上傳圖片與檔案。
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {configs.map((config) => (
            <Card key={config.id}>
              <CardHeader className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {config.name}
                  {config.isActive && <Badge>啟用中</Badge>}
                </CardTitle>
                <StorageConfigRowActions config={config} />
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                <div className="truncate">Endpoint：{config.endpoint}</div>
                <div>Bucket：{config.bucket}</div>
                <div>Region：{config.region}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminShell>
  )
}
