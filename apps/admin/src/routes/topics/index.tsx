import { columns } from '@/components/topics/topics-columns'
import { TopicForm } from '@/components/topics/topic-form'
import AdminShell from '@/components/layout/admin-shell'
import { DataTableContainer } from '@/components/table/table'
import { orpc } from '@/utils/orpc'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useOverlay } from '@/hooks/use-overlay'
import { Button } from '@sao-blog/ui/components/button'
import { PlusIcon } from 'lucide-react'

export const Route = createFileRoute('/topics/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { openDialog } = useOverlay()
  const { data: topics, status } = useQuery(
    orpc.admin.topic.getTopics.queryOptions()
  )

  const openCreateTopicDialog = () => {
    openDialog({
      id: 'create-topic',
      render: ({ close }) => ({
        title: '新增專欄',
        description: '填寫以下資訊以建立新的專欄。',
        body: <TopicForm mode="create" onSuccess={close} onCancel={close} />,
        hideCancel: true,
        hideConfirm: true,
      }),
    })
  }

  return (
    <AdminShell
      title="專欄"
      actions={
        <Button onClick={openCreateTopicDialog} className="gap-2">
          <PlusIcon className="size-4" />
          新增專欄
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
            data={topics?.data || []}
            searchColumnId="name"
          />
        )}
      </div>
    </AdminShell>
  )
}
