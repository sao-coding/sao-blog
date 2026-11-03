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
import { CategoryForm } from '@/components/categories/category-form'

type RouterOutputs = InferClientOutputs<typeof client>;
type Category = RouterOutputs['admin']['category']['getCategories']['data'][number]

interface CategoriesRowActionsProps {
  row: Row<Category>
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
        description:
          '此操作無法復原。刪除後，原本屬於此分類的文章將變成未分類。',
        cancelLabel: '取消',
        confirmLabel: isPending ? '刪除中...' : '確定刪除',
        confirmVariant: 'destructive',
      }),
      onConfirm: async ({ close }) => {
        try {
          const res = await deleteCategoryMutation.mutateAsync({
            id: category.id,
          })

          if (res.status === 'error') {
            toast.error(res.message ?? '刪除分類時發生錯誤，請稍後再試。')
            return
          }

          await queryClient.invalidateQueries({
            queryKey: orpc.admin.category.getCategories.queryOptions().queryKey,
          })
          // 文章的分類可能已被清空，連帶刷新文章列表
          await queryClient.invalidateQueries({
            queryKey: orpc.admin.post.getPosts.queryOptions().queryKey,
          })
          toast.success(res.message ?? `已刪除分類：${category.name}`)
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
