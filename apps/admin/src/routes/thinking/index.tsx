import { columns } from '@/components/thinking/thinking-columns'
import AdminShell from '@/components/layout/admin-shell'
import { DataTableContainer } from '@/components/table/table'
import { orpc, queryClient } from '@/utils/orpc'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@sao-blog/ui/components/button'
import { PlusIcon } from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/thinking/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data: thinkings, status } = useQuery(
    orpc.admin.thinking.getThinkings.queryOptions()
  )

  const deleteThinkingMutation = useMutation(
    orpc.admin.thinking.deleteThinking.mutationOptions()
  )

  const handleBatchDelete = async (rows: { id: string }[]) => {
    try {
      await deleteThinkingMutation.mutateAsync({ ids: rows.map((r) => r.id) })
      await queryClient.invalidateQueries({
        queryKey: orpc.admin.thinking.getThinkings.queryOptions().queryKey,
      })
      toast.success(`已刪除 ${rows.length} 則想法`)
    } catch {
      toast.error('批次刪除失敗，請稍後再試。')
    }
  }

  return (
    <AdminShell
      title="想法"
      description="隨手記下的短篇想法。"
      actions={
        <Button render={<Link to="/thinking/editor" />} nativeButton={false}>
          <PlusIcon />
          新增想法
        </Button>
      }
    >
      <div>
        <DataTableContainer
            columns={columns}
            data={thinkings?.data || []}
            searchColumnId="content"
            onBatchDelete={handleBatchDelete}
            isLoading={status === 'pending'}
          />
      </div>
    </AdminShell>
  )
}
