import AdminShell from '@/components/layout/admin-shell'
import { PostsTableWithActions } from '@/components/posts/posts-table-with-actions'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { orpc } from '@/utils/orpc'


export const Route = createFileRoute('/posts/')({
  component: RouteComponent,
})

function RouteComponent() {

  const { data: posts, status } = useQuery(orpc.admin.post.getPosts.queryOptions())

  return (
    <AdminShell title="文章列表">
      <div>
        {status === 'pending' ? (
          <div className="flex items-center justify-center h-64">
            <span className="text-muted-foreground">載入中...</span>
          </div>
        ) : (
          <PostsTableWithActions data={posts?.data || []} />
        )}
      </div>
    </AdminShell>
  )
}
