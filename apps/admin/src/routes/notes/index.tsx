import AdminShell from '@/components/layout/admin-shell'
import { NotesTableWithActions } from '@/components/notes/notes-table-with-actions'
import { orpc } from '@/utils/orpc'
import { Button } from '@sao-blog/ui/components/button'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'

export const Route = createFileRoute('/notes/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data: notesData, status } = useQuery(
    orpc.admin.note.getNotes.queryOptions()
  )

  return (
    <AdminShell
      title="日記"
      description="生活紀錄，可以附上心情、天氣與地點，也能歸到專欄。"
      actions={
        <Button render={<Link to="/notes/editor" />} nativeButton={false}>
          <PlusIcon />
          新增日記
        </Button>
      }
    >
      <div>
        <NotesTableWithActions data={notesData?.data || []} isLoading={status === 'pending'} />
      </div>
    </AdminShell>
  )
}
