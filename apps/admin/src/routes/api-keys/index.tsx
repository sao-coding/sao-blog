import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api-keys/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/api-keys/"!</div>
}
