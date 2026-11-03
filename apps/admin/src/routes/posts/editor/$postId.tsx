import { createFileRoute } from '@tanstack/react-router'
import { PostEditor } from '@/components/posts/post-editor'
 
export const Route = createFileRoute('/posts/editor/$postId')({
  component: RouteComponent,
})
 
function RouteComponent() {
  const { postId } = Route.useParams()
  return <PostEditor postId={postId} />
}
 