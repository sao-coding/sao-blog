'use client'

import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@sao-blog/ui/components/dropdown-menu'
import { type Row } from '@tanstack/react-table'
import { toast } from 'sonner'
import { useMutation } from '@tanstack/react-query'
import { ActionMenu } from '@/components/overlay/action-menu'
import { useOverlay } from '@/hooks/use-overlay'
import { authClient } from '@/lib/auth-client'
import { queryClient } from '@/utils/orpc'
import type { ApiKey } from '@/types/api-key'
import { apiKeysQueryKey } from './use-api-keys'

interface RowActionsProps {
  row: Row<ApiKey>
}

export function RowActions({ row }: RowActionsProps) {
  const { openAlertDialog } = useOverlay()
  const apiKey = row.original
  const label = apiKey.name ?? '未命名金鑰'

  const deleteApiKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      const { error } = await authClient.apiKey.delete({ keyId })
      if (error) {
        throw new Error(error.message ?? '刪除 API 金鑰失敗')
      }
    },
  })

  const openDeleteApiKeyDialog = () => {
    openAlertDialog({
      id: `delete-api-key-${apiKey.id}`,
      render: ({ isPending }) => ({
        title: `確定撤銷金鑰「${label}」嗎？`,
        description: '撤銷後使用此金鑰的服務將立即失效，且無法復原。',
        cancelLabel: '取消',
        confirmLabel: isPending ? '撤銷中...' : '確定撤銷',
        confirmVariant: 'destructive',
      }),
      onConfirm: async ({ close }) => {
        try {
          await deleteApiKeyMutation.mutateAsync(apiKey.id)
          await queryClient.invalidateQueries({ queryKey: apiKeysQueryKey })
          toast.success(`已撤銷金鑰：${label}`)
          close()
        } catch {
          toast.error('撤銷金鑰時發生錯誤，請稍後再試。')
        }
      },
    })
  }

  return (
    <ActionMenu
      triggerSrLabel="開啟金鑰操作"
      renderItems={() => (
        <>
          <DropdownMenuItem
            onClick={() => {
              navigator.clipboard.writeText(apiKey.id)
              toast.success('已複製金鑰 ID')
            }}
          >
            複製金鑰 ID
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={openDeleteApiKeyDialog}
          >
            撤銷金鑰
          </DropdownMenuItem>
        </>
      )}
    />
  )
}
