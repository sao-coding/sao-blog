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
import { TagForm } from '@/components/tags/tag-form'

type RouterOutputs = InferClientOutputs<typeof client>
type Tag = RouterOutputs['admin']['tag']['getTags']['data'][number]

interface TagsRowActionsProps {
  row: Row<Tag>
}

export function TagsRowActions({ row }: TagsRowActionsProps) {
  const { openAlertDialog, openDialog } = useOverlay()
  const tag = row.original

  const deleteTagMutation = useMutation(
    orpc.admin.tag.deleteTag.mutationOptions()
  )

  const openEditTagDialog = () => {
    openDialog({
      id: `edit-tag-${tag.id}`,
      render: ({ close }) => ({
        title: `編輯標籤：${tag.name}`,
        description: '修改以下欄位並儲存標籤。',
        body: (
          <TagForm
            mode="edit"
            tag={tag}
            onSuccess={close}
            onCancel={close}
          />
        ),
        hideCancel: true,
        hideConfirm: true,
      }),
    })
  }

  const openDeleteTagDialog = () => {
    openAlertDialog({
      id: `delete-tag-${tag.id}`,
      render: ({ isPending }) => ({
        title: `確定刪除標籤「${tag.name}」嗎？`,
        description: '此操作無法復原，刪除後相關資料可能受到影響。',
        body: (
          <p className="text-xs text-muted-foreground">
            第一波先串接全域確認流程，實際刪除 API 可直接接在 onConfirm。
          </p>
        ),
        cancelLabel: '取消',
        confirmLabel: isPending ? '刪除中...' : '確定刪除',
        confirmVariant: 'destructive',
      }),
      onConfirm: async ({ close }) => {
        try {
          await deleteTagMutation.mutateAsync({ id: tag.id })
          await queryClient.invalidateQueries({
            queryKey: orpc.admin.tag.getTags.queryOptions().queryKey,
          })
          toast.success(`已刪除標籤：${tag.name}`)
          close()
        } catch {
          toast.error('刪除標籤時發生錯誤，請稍後再試。')
        }
      },
    })
  }

  return (
    <ActionMenu
      triggerSrLabel="開啟標籤操作"
      renderItems={() => (
        <>
          <DropdownMenuItem
            onClick={() => {
              navigator.clipboard.writeText(tag.id)
              toast.success('已複製標籤 ID')
            }}
          >
            複製標籤 ID
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={openEditTagDialog}>編輯標籤</DropdownMenuItem>
          <DropdownMenuItem
            render={
              <a href={`/tags/${tag.slug}`} target="_blank" rel="noreferrer">
                查看標籤
              </a>
            }
          />
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={openDeleteTagDialog}
          >
            刪除標籤
          </DropdownMenuItem>
        </>
      )}
    />
  )
}