import AdminShell from '@/components/layout/admin-shell'
import { PostsTableWithActions } from '@/components/posts/posts-table-with-actions'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Button } from '@sao-blog/ui/components/button'
import { PlusIcon } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { orpc } from '@/utils/orpc'


export const Route = createFileRoute('/posts/')({
  component: RouteComponent,
})

function RouteComponent() {

  const { data: posts, status } = useQuery(orpc.admin.post.getPosts.queryOptions())

  return (
    <AdminShell
      title="文章"
      description="長篇文章，發佈後會出現在部落格首頁與文章列表。"
      actions={
        <Button render={<Link to="/posts/editor" />} nativeButton={false}>
          <PlusIcon />
          新增文章
        </Button>
      }
    >
      <div>
        <PostsTableWithActions data={posts?.data || []} isLoading={status === 'pending'} />
      </div>
    </AdminShell>
  )
}
