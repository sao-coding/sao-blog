'use client'

import { DropdownMenuItem, DropdownMenuSeparator } from '@sao-blog/ui/components/dropdown-menu'
import { type Row } from '@tanstack/react-table'
import { toast } from 'sonner'
import { CheckIcon, EyeOffIcon, PencilIcon, Trash2Icon, Undo2Icon, XIcon } from 'lucide-react'
import { ActionMenu } from '@/components/overlay/action-menu'
import { useOverlay } from '@/hooks/use-overlay'
import { useMutation } from '@tanstack/react-query'
import { orpc, queryClient } from '@/utils/orpc'
import type { Friend, FriendStatus } from './friends-columns'
import { FriendForm } from './friend-form'

/** 友鏈列表與各狀態數量全部重抓 */
export const invalidateFriends = () =>
  queryClient.invalidateQueries({ queryKey: orpc.admin.friend.key() })

export function FriendsRowActions({ row }: { row: Row<Friend> }) {
  const { openAlertDialog, openDialog } = useOverlay()
  const friend = row.original

  const statusMutation = useMutation(orpc.admin.friend.setFriendStatus.mutationOptions())
  const deleteMutation = useMutation(orpc.admin.friend.deleteFriends.mutationOptions())

  const run = async (action: () => Promise<{ status: string; message: string }>) => {
    try {
      const res = await action()
      if (res.status !== 'success') {
        toast.error(res.message)
        return
      }
      await invalidateFriends()
      toast.success(res.message)
    } catch {
      toast.error('操作失敗，請稍後再試。')
    }
  }

  const setStatus = (status: FriendStatus) => () =>
    run(() => statusMutation.mutateAsync({ ids: [friend.id], status }))

  const openEditDialog = () => {
    openDialog({
      id: `edit-friend-${friend.id}`,
      render: ({ close }) => ({
        title: `編輯 ${friend.name}`,
        body: <FriendForm mode="edit" friend={friend} onSuccess={close} onCancel={close} />,
        hideCancel: true,
        hideConfirm: true,
      }),
    })
  }

  const openDeleteDialog = () => {
    openAlertDialog({
      id: `delete-friend-${friend.id}`,
      render: ({ isPending }) => ({
        title: '確定永久刪除這個友鏈嗎？',
        description: '朋友圈裡這個站的文章也會一起刪除，無法復原。只是不想顯示的話，改用「下架」。',
        cancelLabel: '取消',
        confirmLabel: isPending ? '刪除中...' : '確定刪除',
        confirmVariant: 'destructive',
      }),
      onConfirm: async ({ close }) => {
        await run(() => deleteMutation.mutateAsync({ ids: [friend.id] }))
        close()
      },
    })
  }

  return (
    <ActionMenu
      triggerSrLabel="開啟友鏈操作"
      widthClassName="w-44"
      label="審核"
      renderItems={() => (
        <>
          {friend.status !== 'approved' && (
            <DropdownMenuItem onClick={setStatus('approved')}>
              <CheckIcon />
              通過
            </DropdownMenuItem>
          )}
          {friend.status === 'pending' && (
            <DropdownMenuItem onClick={setStatus('rejected')}>
              <XIcon />
              拒絕
            </DropdownMenuItem>
          )}
          {friend.status === 'approved' && (
            <DropdownMenuItem onClick={setStatus('hidden')}>
              <EyeOffIcon />
              下架
            </DropdownMenuItem>
          )}
          {friend.status !== 'pending' && (
            <DropdownMenuItem onClick={setStatus('pending')}>
              <Undo2Icon />
              退回待審
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={openEditDialog}>
            <PencilIcon />
            編輯
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={openDeleteDialog}>
            <Trash2Icon />
            刪除
          </DropdownMenuItem>
        </>
      )}
    />
  )
}
