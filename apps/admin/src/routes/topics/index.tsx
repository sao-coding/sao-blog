import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/topics/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/topics/"!</div>
}
