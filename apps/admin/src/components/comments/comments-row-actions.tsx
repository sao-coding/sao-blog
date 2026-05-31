'use client'

import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@sao-blog/ui/components/dropdown-menu'
import { type Row } from '@tanstack/react-table'
import { toast } from 'sonner'
import type { InferClientOutputs } from '@orpc/client'
import type { client } from '@/utils/orpc'
import { ActionMenu } from '@/components/overlay/action-menu'
import { useOverlay } from '@/hooks/use-overlay'
import { useMutation } from '@tanstack/react-query'
import { orpc, queryClient } from '@/utils/orpc'

type RouterOutputs = InferClientOutputs<typeof client>
type Comment =
  RouterOutputs['admin']['comment']['getComments']['data'][number]

interface CommentsRowActionsProps {
  row: Row<Comment>
}

export function CommentsRowActions({ row }: CommentsRowActionsProps) {
  const { openAlertDialog } = useOverlay()
  const comment = row.original

  const deleteCommentMutation = useMutation(
    orpc.admin.comment.deleteComment.mutationOptions()
  )
  const setDeletedMutation = useMutation(
    orpc.admin.comment.setCommentDeleted.mutationOptions()
  )
  const setPinMutation = useMutation(
    orpc.admin.comment.setCommentPin.mutationOptions()
  )

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: orpc.admin.comment.getComments.queryOptions().queryKey,
    })

  const togglePin = async () => {
    try {
      await setPinMutation.mutateAsync({ id: comment.id, pin: !comment.pin })
      await invalidate()
      toast.success(comment.pin ? '已取消置頂' : '已置頂留言')
    } catch {
      toast.error('操作失敗，請稍後再試。')
    }
  }

  const toggleDeleted = async () => {
    try {
      await setDeletedMutation.mutateAsync({
        id: comment.id,
        deleted: !comment.deleted,
      })
      await invalidate()
      toast.success(comment.deleted ? '已還原留言' : '已隱藏留言')
    } catch {
      toast.error('操作失敗，請稍後再試。')
    }
  }

  const openDeleteCommentDialog = () => {
    openAlertDialog({
      id: `delete-comment-${comment.id}`,
      render: ({ isPending }) => ({
        title: '確定永久刪除這則留言嗎？',
        description: '此操作無法復原，留言將從資料庫中徹底移除。',
        cancelLabel: '取消',
        confirmLabel: isPending ? '刪除中...' : '確定刪除',
        confirmVariant: 'destructive',
      }),
      onConfirm: async ({ close }) => {
        try {
          await deleteCommentMutation.mutateAsync({ id: comment.id })
          await invalidate()
          toast.success('已刪除留言')
          close()
        } catch {
          toast.error('刪除留言時發生錯誤，請稍後再試。')
        }
      },
    })
  }

  return (
    <ActionMenu
      triggerSrLabel="開啟留言操作"
      renderItems={() => (
        <>
          <DropdownMenuItem
            onClick={() => {
              navigator.clipboard.writeText(comment.id)
              toast.success('已複製留言 ID')
            }}
          >
            複製留言 ID
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={togglePin}>
            {comment.pin ? '取消置頂' : '置頂留言'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={toggleDeleted}>
            {comment.deleted ? '還原留言' : '隱藏留言'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={openDeleteCommentDialog}
          >
            永久刪除
          </DropdownMenuItem>
        </>
      )}
    />
  )
}
