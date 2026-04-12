'use client'

import type { InferClientOutputs } from '@orpc/client'
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@sao-blog/ui/components/dropdown-menu'
import { useMutation } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import type { Row } from '@tanstack/react-table'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { ActionMenu } from '@/components/overlay/action-menu'
import { useOverlay } from '@/hooks/use-overlay'
import { client, orpc, queryClient } from '@/utils/orpc'

type RouterOutputs = InferClientOutputs<typeof client>
type Note = RouterOutputs['admin']['note']['getNotes']['data'][number]

interface NoteRowActionsProps {
  row: Row<Note>
}

export function NoteRowActions({ row }: NoteRowActionsProps) {
  const { openAlertDialog } = useOverlay()
  const note = row.original

  const deleteNoteMutation = useMutation(orpc.admin.note.deleteNote.mutationOptions())

  const openDeleteNoteDialog = () => {
    openAlertDialog({
      id: `delete-note-${note.id}`,
      render: ({ isPending }) => ({
        title: `確定刪除日記「${note.title}」嗎？`,
        description: '此操作無法復原，刪除後將無法還原日記內容。',
        cancelLabel: '取消',
        confirmLabel: isPending ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            刪除中...
          </span>
        ) : (
          '確定刪除'
        ),
        confirmVariant: 'destructive',
      }),
      onConfirm: async ({ close }) => {
        try {
          await deleteNoteMutation.mutateAsync({ ids: [note.id] })
          await queryClient.invalidateQueries({
            queryKey: orpc.admin.note.getNotes.queryOptions().queryKey,
          })
          toast.success(`已刪除日記：${note.title}`)
          close()
        } catch {
          toast.error('刪除日記時發生錯誤，請稍後再試。')
        }
      },
    })
  }

  return (
    <ActionMenu
      triggerSrLabel="開啟日記操作"
      renderItems={() => (
        <>
          <DropdownMenuItem
            onClick={() => {
              navigator.clipboard.writeText(note.id)
              toast.success('已複製日記 ID')
            }}
          >
            複製日記 ID
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            render={
              <Link params={{ noteId: note.id }} to="/notes/editor/$noteId">
                編輯日記
              </Link>
            }
          />
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={openDeleteNoteDialog}>
            刪除日記
          </DropdownMenuItem>
        </>
      )}
    />
  )
}