import AdminShell from '@/components/layout/admin-shell'
import { PostsTableWithActions } from '@/components/posts/posts-table-with-actions'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { orpc } from '@/utils/orpc'


export const Route = createFileRoute('/posts/')({
  component: RouteComponent,
})

function RouteComponent() {

  const { data: posts, isLoading } = useQuery(orpc.admin.post.getPosts.getKey(), orpc.admin.post.getPosts)

  return (
    <AdminShell title="文章列表">
      <div>
        <PostsTableWithActions data={posts.data} />
      </div>
    </AdminShell>
  )
}
