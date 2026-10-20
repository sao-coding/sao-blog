import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_layout/notes')({
  component: NotesLayout,
})

function NotesLayout() {
  return <Outlet />
}
