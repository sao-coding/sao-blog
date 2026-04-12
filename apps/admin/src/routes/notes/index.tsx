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
      title="日記列表"
      actions={
        <Button
          render={
            <Link className="inline-flex items-center" to="/notes/editor">
              <PlusIcon className="h-4 w-4 mr-2" />
            新增日記
            </Link>
          }
        />
      }
    >
      <div>
        {status === 'pending' ? (
          <div className="flex items-center justify-center h-64">
            <span className="text-muted-foreground">載入中...</span>
          </div>
        ) : (
          <NotesTableWithActions data={notesData?.data || []} />
        )}
      </div>
    </AdminShell>
  )
}
