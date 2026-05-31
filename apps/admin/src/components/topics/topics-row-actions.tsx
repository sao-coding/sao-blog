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
import { TopicForm } from './topic-form'

type RouterOutputs = InferClientOutputs<typeof client>
type Topic = RouterOutputs['admin']['topic']['getTopics']['data'][number]

interface TopicsRowActionsProps {
  row: Row<Topic>
}

export function TopicsRowActions({ row }: TopicsRowActionsProps) {
  const { openAlertDialog, openDialog } = useOverlay()
  const topic = row.original

  const deleteTopicMutation = useMutation(
    orpc.admin.topic.deleteTopic.mutationOptions()
  )

  const openEditTopicDialog = () => {
    openDialog({
      id: `edit-topic-${topic.id}`,
      render: ({ close }) => ({
        title: `編輯專欄：${topic.name}`,
        description: '修改以下欄位並儲存專欄。',
        body: (
          <TopicForm
            mode="edit"
            topic={topic}
            onSuccess={close}
            onCancel={close}
          />
        ),
        hideCancel: true,
        hideConfirm: true,
      }),
    })
  }

  const openDeleteTopicDialog = () => {
    openAlertDialog({
      id: `delete-topic-${topic.id}`,
      render: ({ isPending }) => ({
        title: `確定刪除專欄「${topic.name}」嗎？`,
        description: '此操作無法復原，相關日記的專欄關聯會被移除。',
        cancelLabel: '取消',
        confirmLabel: isPending ? '刪除中...' : '確定刪除',
        confirmVariant: 'destructive',
      }),
      onConfirm: async ({ close }) => {
        try {
          await deleteTopicMutation.mutateAsync({ id: topic.id })
          await queryClient.invalidateQueries({
            queryKey: orpc.admin.topic.getTopics.queryOptions().queryKey,
          })
          toast.success(`已刪除專欄：${topic.name}`)
          close()
        } catch {
          toast.error('刪除專欄時發生錯誤，請稍後再試。')
        }
      },
    })
  }

  return (
    <ActionMenu
      triggerSrLabel="開啟專欄操作"
      renderItems={() => (
        <>
          <DropdownMenuItem
            onClick={() => {
              navigator.clipboard.writeText(topic.id)
              toast.success('已複製專欄 ID')
            }}
          >
            複製專欄 ID
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={openEditTopicDialog}>
            編輯專欄
          </DropdownMenuItem>
          <DropdownMenuItem
            render={
              <a
                href={`/notes/topics/${topic.slug}`}
                target="_blank"
                rel="noreferrer"
              >
                查看專欄
              </a>
            }
          />
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={openDeleteTopicDialog}
          >
            刪除專欄
          </DropdownMenuItem>
        </>
      )}
    />
  )
}
