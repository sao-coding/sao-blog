'use client'

import { DropdownMenuItem, DropdownMenuSeparator } from '@sao-blog/ui/components/dropdown-menu'
import { PencilIcon, StarIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import type { InferClientOutputs } from '@orpc/client'
import type { client } from '@/utils/orpc'
import { ActionMenu } from '@/components/overlay/action-menu'
import { useOverlay } from '@/hooks/use-overlay'
import { useMutation } from '@tanstack/react-query'
import { orpc, queryClient } from '@/utils/orpc'
import { StorageConfigForm } from '@/components/storage/storage-config-form'

type RouterOutputs = InferClientOutputs<typeof client>
type StorageConfig = RouterOutputs['admin']['storageConfig']['getConfigs']['data'][number]

interface StorageConfigRowActionsProps {
  config: StorageConfig
}

export function StorageConfigRowActions({ config }: StorageConfigRowActionsProps) {
  const { openAlertDialog, openDialog } = useOverlay()

  const activateMutation = useMutation(orpc.admin.storageConfig.activateConfig.mutationOptions())
  const deleteMutation = useMutation(orpc.admin.storageConfig.deleteConfig.mutationOptions())

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: orpc.admin.storageConfig.getConfigs.queryOptions().queryKey,
    })

  const handleActivate = async () => {
    try {
      await activateMutation.mutateAsync({ id: config.id })
      await invalidate()
      toast.success(`已啟用「${config.name}」`)
    } catch {
      toast.error('啟用儲存設定時發生錯誤，請稍後再試。')
    }
  }

  const openEditDialog = () => {
    openDialog({
      id: `edit-storage-config-${config.id}`,
      render: ({ close }) => ({
        title: `編輯儲存設定：${config.name}`,
        description: '修改以下欄位並儲存設定。',
        body: <StorageConfigForm mode="edit" config={config} onSuccess={close} onCancel={close} />,
        hideCancel: true,
        hideConfirm: true,
      }),
    })
  }

  const openDeleteDialog = () => {
    openAlertDialog({
      id: `delete-storage-config-${config.id}`,
      render: ({ isPending }) => ({
        title: `確定刪除儲存設定「${config.name}」嗎？`,
        description: '此操作無法復原。已上傳的檔案不會被刪除，但需要重新啟用對應設定才能讀取。',
        cancelLabel: '取消',
        confirmLabel: isPending ? '刪除中...' : '確定刪除',
        confirmVariant: 'destructive',
      }),
      onConfirm: async ({ close }) => {
        const result = await deleteMutation.mutateAsync({ id: config.id }).catch(() => null)
        if (!result) {
          toast.error('刪除儲存設定時發生錯誤，請稍後再試。')
          return
        }
        if (result.status === 'error') {
          toast.error(result.message)
          return
        }
        await invalidate()
        toast.success(`已刪除「${config.name}」`)
        close()
      },
    })
  }

  return (
    <ActionMenu
      triggerSrLabel={`開啟「${config.name}」的操作`}
      widthClassName="w-44"
      renderItems={() => (
        <>
          {!config.isActive && (
            <DropdownMenuItem disabled={activateMutation.isPending} onClick={handleActivate}>
              <StarIcon />
              設為啟用
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={openEditDialog}>
            <PencilIcon />
            編輯
          </DropdownMenuItem>
          {/* 啟用中的設定伺服器不給刪，直接不顯示，比一個要解釋的 disabled 項目乾淨 */}
          {!config.isActive && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={openDeleteDialog}>
                <Trash2Icon />
                刪除
              </DropdownMenuItem>
            </>
          )}
        </>
      )}
    />
  )
}
