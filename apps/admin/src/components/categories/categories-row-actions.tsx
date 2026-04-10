'use client'

import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@sao-blog/ui/components/dropdown-menu'
import { type Row } from '@tanstack/react-table'
import { toast } from 'sonner'
import type { CategoryItem } from '@/types/category'
import { ActionMenu } from '@/components/overlay/action-menu'
import { useOverlay } from '@/hooks/use-overlay'
import { categoryInputSchema } from '@sao-blog/api/schema/category'
import { useForm } from 'react-hook-form'
import type z from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

type CategoryFormValues = z.infer<typeof categoryInputSchema>

interface CategoriesRowActionsProps {
  row: Row<CategoryItem>
}

export function CategoriesRowActions({ row }: CategoriesRowActionsProps) {
  const { openAlertDialog, openDialog } = useOverlay()
  const category = row.original

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryInputSchema),
    values: {

    },
  });

  const openEditCategoryDialog = () => {
    openDialog({
      id: `edit-category-${category.id}`,
      render: ({ isPending }) => ({
        title: `編輯分類：${category.name}`,
        description: '第一波已完成全域 Overlay 接管，此處先保留為可擴充入口。',
        body: (
          <div className="text-sm text-muted-foreground">
            你可以在下一步把分類表單掛到這個 Dialog 內。
          </div>
        ),
        cancelLabel: '關閉',
        confirmLabel: isPending ? '處理中...' : '我知道了',
        hideCancel: true,
      }),
      onConfirm: ({ close }) => {
        close()
      },
    })
  }

  const openDeleteCategoryDialog = () => {
    openAlertDialog({
      id: `delete-category-${category.id}`,
      render: ({ isPending }) => ({
        title: `確定刪除分類「${category.name}」嗎？`,
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
        toast.success(`已觸發刪除流程（示範）：${category.name}`)
        close()
      },
    })
  }

  return (
    <ActionMenu
      triggerSrLabel="開啟分類操作"
      renderItems={() => (
        <>
            <DropdownMenuItem
              onClick={() => {
                navigator.clipboard.writeText(category.id)
                toast.success('已複製分類 ID')
              }}
            >
              複製分類 ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={openEditCategoryDialog}>
              編輯分類
            </DropdownMenuItem>
            <DropdownMenuItem
              render={
                <a href={`/categories/${category.slug}`} target="_blank" rel="noreferrer">
                查看分類
                </a>
              }
            />
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={openDeleteCategoryDialog}
            >
              刪除分類
            </DropdownMenuItem>
        </>
      )}
    />
  )
}
