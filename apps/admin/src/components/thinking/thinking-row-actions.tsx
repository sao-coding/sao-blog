'use client'

import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@sao-blog/ui/components/dropdown-menu'
import { type Row } from '@tanstack/react-table'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import type { InferClientOutputs } from '@orpc/client'
import type { client } from '@/utils/orpc'
import { ActionMenu } from '@/components/overlay/action-menu'
import { useOverlay } from '@/hooks/use-overlay'
import { useMutation } from '@tanstack/react-query'
import { orpc, queryClient } from '@/utils/orpc'

type RouterOutputs = InferClientOutputs<typeof client>
type Thinking =
  RouterOutputs['admin']['thinking']['getThinkings']['data'][number]

interface ThinkingRowActionsProps {
  row: Row<Thinking>
}

export function ThinkingRowActions({ row }: ThinkingRowActionsProps) {
  const { openAlertDialog } = useOverlay()
  const navigate = useNavigate()
  const thinking = row.original

  const deleteThinkingMutation = useMutation(
    orpc.admin.thinking.deleteThinking.mutationOptions()
  )

  const openDeleteThinkingDialog = () => {
    openAlertDialog({
      id: `delete-thinking-${thinking.id}`,
      render: ({ isPending }) => ({
        title: '確定刪除這則想法嗎？',
        description: '此操作無法復原。',
        cancelLabel: '取消',
        confirmLabel: isPending ? '刪除中...' : '確定刪除',
        confirmVariant: 'destructive',
      }),
      onConfirm: async ({ close }) => {
        try {
          await deleteThinkingMutation.mutateAsync({ ids: [thinking.id] })
          await queryClient.invalidateQueries({
            queryKey: orpc.admin.thinking.getThinkings.queryOptions().queryKey,
          })
          toast.success('已刪除想法')
          close()
        } catch {
          toast.error('刪除想法時發生錯誤，請稍後再試。')
        }
      },
    })
  }

  return (
    <ActionMenu
      triggerSrLabel="開啟想法操作"
      renderItems={() => (
        <>
          <DropdownMenuItem
            onClick={() => {
              navigator.clipboard.writeText(thinking.id)
              toast.success('已複製想法 ID')
            }}
          >
            複製想法 ID
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() =>
              navigate({
                to: '/thinking/editor/$thinkingId',
                params: { thinkingId: thinking.id },
              })
            }
          >
            編輯想法
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={openDeleteThinkingDialog}
          >
            刪除想法
          </DropdownMenuItem>
        </>
      )}
    />
  )
}
