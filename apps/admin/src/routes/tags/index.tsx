import { TagForm } from '@/components/tags/tag-form'
import AdminShell from '@/components/layout/admin-shell'
import { DataTableContainer } from '@/components/table/table'
import { columns } from '@/components/tags/tags-columns'
import { orpc } from '@/utils/orpc'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useOverlay } from '@/hooks/use-overlay'
import { Button } from '@sao-blog/ui/components/button'
import { PlusIcon } from 'lucide-react'

export const Route = createFileRoute('/tags/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { openDialog } = useOverlay()
  const { data: tags, status } = useQuery(orpc.admin.tag.getTags.queryOptions())

  const openCreateTagDialog = () => {
    openDialog({
      id: 'create-tag',
      render: ({ close }) => ({
        title: '新增標籤',
        description: '填寫以下資訊以建立新的標籤。',
        body: <TagForm mode="create" onSuccess={close} onCancel={close} />,
        hideCancel: true,
        hideConfirm: true,
      }),
    })
  }

  return (
    <AdminShell
      title="標籤"
      actions={
        <Button onClick={openCreateTagDialog} className="gap-2">
          <PlusIcon className="size-4" />
          新增標籤
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
            data={tags?.data || []}
            searchColumnId="name"
          />
        )}
      </div>
    </AdminShell>
  )
}
