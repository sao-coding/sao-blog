import { createFileRoute } from '@tanstack/react-router'
import { ThinkingEditor } from '@/components/thinking/thinking-editor'

export const Route = createFileRoute('/thinking/editor/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <ThinkingEditor />
}
