import AdminShell from '@/components/layout/admin-shell'
import { PostsTableWithActions } from '@/components/posts/posts-table-with-actions'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Button } from '@sao-blog/ui/components/button'
import { PlusIcon, RefreshCwIcon } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { orpc } from '@/utils/orpc'


export const Route = createFileRoute('/posts/')({
  component: RouteComponent,
})

function RouteComponent() {

  const queryClient = useQueryClient()
  const { data: posts, status } = useQuery(orpc.admin.post.getPosts.queryOptions())

  // 留言數、讚數、分類 / 標籤 / 專欄的文章數都是另外維護的計數器；萬一漏算，一鍵全部重算
  const recount = useMutation({
    mutationFn: () => orpc.admin.counter.recount.call({ type: 'all' }),
    onSuccess: (res) => {
      if (res.status === 'error') return toast.error(res.message)
      toast.success(res.message)
      queryClient.invalidateQueries()
    },
    onError: (e) => toast.error(e.message),
  })

  return (
    <AdminShell
      title="文章"
      description="長篇文章，發佈後會出現在部落格首頁與文章列表。"
      actions={
        <>
        <Button variant="outline" onClick={() => recount.mutate()} disabled={recount.isPending}>
          <RefreshCwIcon className={recount.isPending ? 'animate-spin' : undefined} />
          重算計數器
        </Button>
        <Button render={<Link to="/posts/editor" />} nativeButton={false}>
          <PlusIcon />
          新增文章
        </Button>
        </>
      }
    >
      <div>
        <PostsTableWithActions data={posts?.data || []} isLoading={status === 'pending'} />
      </div>
    </AdminShell>
  )
}
