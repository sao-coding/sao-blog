import { columns } from '@/components/categories/categories-columns'
import AdminShell from '@/components/layout/admin-shell'
import { DataTableContainer } from '@/components/table/table'
import { orpc } from '@/utils/orpc'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/categories/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data: categories, status } = useQuery(orpc.admin.category.getCategories.queryOptions())

  return (
    <AdminShell title="分類">
      <div>
        {status === 'pending' ? (
          <div className="flex items-center justify-center h-64">
            <span className="text-muted-foreground">載入中...</span>
          </div>
        ) : (
          <DataTableContainer
            columns={columns}
            searchColumnId="title"
            data={categories?.data || []}
          />
        )}
      </div>
    </AdminShell>
  )
}
