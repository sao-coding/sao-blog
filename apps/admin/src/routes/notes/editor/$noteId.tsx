import { createFileRoute } from '@tanstack/react-router'
import { NoteEditor } from '@/components/notes/note-editor'

export const Route = createFileRoute('/notes/editor/$noteId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { noteId } = Route.useParams()
  return <NoteEditor noteId={noteId} />
}

 