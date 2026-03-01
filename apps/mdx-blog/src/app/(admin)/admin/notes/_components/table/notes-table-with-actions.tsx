'use client'

import { useState } from 'react'
import { NoteItem } from '@/types/note'
import { DataTableContainer } from '../../../../_components/table/table'
import { columns } from './notes-columns'
import { deleteNotes } from '../../_actions/notes-actions'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface NotesTableWithActionsProps {
  data: NoteItem[]
}

export function NotesTableWithActions({ data }: NotesTableWithActionsProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedNotes, setSelectedNotes] = useState<NoteItem[]>([])
  const [isDeleting, setIsDeleting] = useState(false)

  const handleBatchDelete = (notes: NoteItem[]) => {
    setSelectedNotes(notes)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (selectedNotes.length === 0) return

    setIsDeleting(true)

    try {
      const noteIds = selectedNotes.map((note) => note.id)

      // 如果只有一個日記，使用單個刪除 API
      if (noteIds.length === 1) {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/admin/notes/${noteIds[0]}`,
          {
            method: 'DELETE',
            credentials: 'include',
          }
        )
        const result = await res.json()

        if (result.status === 'success') {
          toast.success(`成功刪除 ${selectedNotes.length} 篇日記`)
          setIsDeleteDialogOpen(false)
          setSelectedNotes([])
        } else {
          toast.error(result.error || '刪除失敗，請稍後再試')
        }
      } else {
        // 批量刪除
        const result = await deleteNotes(noteIds)

        if (result.success) {
          toast.success(`成功刪除 ${selectedNotes.length} 篇日記`)
          setIsDeleteDialogOpen(false)
          setSelectedNotes([])
        } else {
          toast.error(result.error || '刪除失敗，請稍後再試')
        }
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('刪除失敗，請稍後再試')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <DataTableContainer
        columns={columns}
        searchColumnId="title"
        data={data}
        onBatchDelete={handleBatchDelete}
      />

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要刪除選中的日記嗎？</AlertDialogTitle>
            <AlertDialogDescription>
              您將要刪除 {selectedNotes.length}{' '}
              篇日記。此操作無法復原，這將永久刪除這些日記及其相關數據。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  正在刪除...
                </>
              ) : (
                '確定刪除'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
