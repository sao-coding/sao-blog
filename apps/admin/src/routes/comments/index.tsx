import { columns } from '@/components/comments/comments-columns'
import AdminShell from '@/components/layout/admin-shell'
import { DataTableContainer } from '@/components/table/table'
import { orpc } from '@/utils/orpc'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/comments/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data: comments, status } = useQuery(
    orpc.admin.comment.getComments.queryOptions()
  )

  return (
    <AdminShell title="留言管理">
      <div>
        {status === 'pending' ? (
          <div className="flex h-64 items-center justify-center">
            <span className="text-muted-foreground">載入中...</span>
          </div>
        ) : (
          <DataTableContainer
            columns={columns}
            data={comments?.data || []}
            searchColumnId="displayUsername"
          />
        )}
      </div>
    </AdminShell>
  )
}
