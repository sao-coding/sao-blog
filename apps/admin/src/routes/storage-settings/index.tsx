import { StorageConfigForm } from '@/components/storage/storage-config-form'
import { StorageConfigCard } from '@/components/storage/storage-config-card'
import AdminShell from '@/components/layout/admin-shell'
import { orpc } from '@/utils/orpc'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useOverlay } from '@/hooks/use-overlay'
import { Button } from '@sao-blog/ui/components/button'
import { Skeleton } from '@sao-blog/ui/components/skeleton'
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

  // 啟用中的排最前面（新上傳都往它去），其餘照名稱排
  const configs = [...(data?.data ?? [])].sort(
    (a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name),
  )

  return (
    <AdminShell
      title="儲存設定"
      description="S3 相容的儲存空間連線，同時只會啟用一組，新上傳的檔案都會存到啟用中的那一組。"
      actions={
        <Button onClick={openCreateDialog} className="gap-2">
          <PlusIcon className="size-4" />
          新增設定
        </Button>
      }
    >
      {status === 'pending' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }, (_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
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
        <ul className="grid gap-4 lg:grid-cols-2">
          {configs.map((config) => (
            <StorageConfigCard key={config.id} config={config} />
          ))}
        </ul>
      )}
    </AdminShell>
  )
}
