import { createFileRoute } from '@tanstack/react-router'
import { PostEditor } from '@/components/posts/post-editor'

export const Route = createFileRoute('/posts/editor/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <PostEditor />
}