'use client'

import { useState } from 'react'
import type { InferClientOutputs } from '@orpc/client'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@sao-blog/ui/components/alert-dialog'
import { Button } from '@sao-blog/ui/components/button'
import { useMutation } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { DataTableContainer } from '@/components/table/table'
import { client, orpc, queryClient } from '@/utils/orpc'
import { columns } from './notes-columns'

type RouterOutputs = InferClientOutputs<typeof client>
type Notes = RouterOutputs['admin']['note']['getNotes']['data']

interface NotesTableWithActionsProps {
  data: Notes
}

export function NotesTableWithActions({ data }: NotesTableWithActionsProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedNotes, setSelectedNotes] = useState<Notes>([])

  const deleteNoteMutation = useMutation(orpc.admin.note.deleteNote.mutationOptions())

  const handleBatchDelete = (notes: Notes) => {
    setSelectedNotes(notes)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (selectedNotes.length === 0) return

    try {
      await deleteNoteMutation.mutateAsync({
        ids: selectedNotes.map((note) => note.id),
      })

      await queryClient.invalidateQueries({
        queryKey: orpc.admin.note.getNotes.queryOptions().queryKey,
      })

      toast.success(`成功刪除 ${selectedNotes.length} 篇日記`)
      setIsDeleteDialogOpen(false)
      setSelectedNotes([])
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('刪除失敗，請稍後再試')
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

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要刪除選中的日記嗎？</AlertDialogTitle>
            <AlertDialogDescription>
              您將要刪除 {selectedNotes.length}{' '}
              篇日記。此操作無法復原，這將永久刪除這些日記及其相關數據。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteNoteMutation.isPending}>
              取消
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteNoteMutation.isPending}
            >
              {deleteNoteMutation.isPending ? (
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