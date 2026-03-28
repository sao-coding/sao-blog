import AdminShell from '@/components/layout/admin-shell'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { orpc } from '@/utils/orpc'


export const Route = createFileRoute('/posts/editor/$postId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { postId } = Route.useParams()
  const { data: post, status } = useQuery(orpc.admin.post.getPost.queryOptions({ input: { id: postId } }))

  return (
    <AdminShell title="文章列表">
      {status === 'pending' && <p>Loading...</p>}
      {status === 'error' && <p>Error loading post data.</p>}
      {status === 'success' && post.data && (
        <div>
          <h1>{post.data.title}</h1>
          <p>Author: {post.data.author.name}</p>
          <p>Category: {post.data.category.name}</p>
          <p>Status: {post.data.status}</p>
          {/* Add more post details and editing UI here */}
        </div>
      )}
    </AdminShell>
  )
}
