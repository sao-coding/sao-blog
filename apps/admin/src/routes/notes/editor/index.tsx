import { createFileRoute } from '@tanstack/react-router'
import { NoteEditor } from '@/components/notes/note-editor'

export const Route = createFileRoute('/notes/editor/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <NoteEditor />
}