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
import { useMutation } from '@tanstack/react-query'
import { orpc, queryClient } from '@/utils/orpc'
import { CategoryForm } from '@/components/categories/category-form'

interface CategoriesRowActionsProps {
  row: Row<CategoryItem>
}

export function CategoriesRowActions({ row }: CategoriesRowActionsProps) {
  const { openAlertDialog, openDialog } = useOverlay()
  const category = row.original

  const deleteCategoryMutation = useMutation(
    orpc.admin.category.deleteCategory.mutationOptions()
  )

  const openEditCategoryDialog = () => {
    openDialog({
      id: `edit-category-${category.id}`,
      render: ({ close }) => ({
        title: `編輯分類：${category.name}`,
        description: '修改以下欄位並儲存分類。',
        body: (
          <CategoryForm
            mode="edit"
            category={category}
            onSuccess={close}
            onCancel={close}
          />
        ),
        hideCancel: true,
        hideConfirm: true,
      }),
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
        try {
          await deleteCategoryMutation.mutateAsync({ id: category.id })
          await queryClient.invalidateQueries({
            queryKey: orpc.admin.category.getCategories.queryOptions().queryKey,
          })
          toast.success(`已刪除分類：${category.name}`)
          close()
        } catch {
          toast.error('刪除分類時發生錯誤，請稍後再試。')
        }
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
