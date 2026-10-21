import { columns } from '@/components/categories/categories-columns'
import { CategoryForm } from '@/components/categories/category-form'
import AdminShell from '@/components/layout/admin-shell'
import { DataTableContainer } from '@/components/table/table'
import { orpc } from '@/utils/orpc'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useOverlay } from '@/hooks/use-overlay'
import { Button } from '@sao-blog/ui/components/button'
import { PlusIcon } from 'lucide-react'

export const Route = createFileRoute('/categories/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { openDialog } = useOverlay()
  const { data: categories, status } = useQuery(orpc.admin.category.getCategories.queryOptions())

  const openCreateCategoryDialog = () => {
    openDialog({
      id: 'create-category',
      render: ({ close }) => ({
        title: '新增分類',
        description: '填寫以下資訊以建立新的分類。',
        body: (
          <CategoryForm
            mode="create"
            onSuccess={close}
            onCancel={close}
          />
        ),
        hideCancel: true,
        hideConfirm: true,
      }),
    })
  }

  return (
    <AdminShell
      title="分類"
      description="文章的大分類，每篇文章屬於一個分類。"
      actions={
        <Button onClick={openCreateCategoryDialog} className="gap-2">
          <PlusIcon className="size-4" />
          新增分類
        </Button>
      }
    >
      <div>
        <DataTableContainer
            columns={columns}
            searchColumnId="name"
            data={categories?.data || []}
            isLoading={status === 'pending'}
          />
      </div>
    </AdminShell>
  )
}
