import { createFileRoute, useParams } from '@tanstack/react-router'
import { ThinkingEditor } from '@/components/thinking/thinking-editor'

export const Route = createFileRoute('/thinking/editor/$thinkingId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { thinkingId } = useParams({ from: '/thinking/editor/$thinkingId' })
  return <ThinkingEditor thinkingId={thinkingId} />
}
