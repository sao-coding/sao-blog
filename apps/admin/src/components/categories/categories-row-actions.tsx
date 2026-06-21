'use client'

import { useState } from 'react'
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
import { useMutation, useQuery } from '@tanstack/react-query'
import { orpc, queryClient } from '@/utils/orpc'
import { CategoryForm } from '@/components/categories/category-form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@sao-blog/ui/components/select'

type RouterOutputs = InferClientOutputs<typeof client>;
type Category = RouterOutputs['admin']['category']['getCategories']['data'][number]

interface CategoriesRowActionsProps {
  row: Row<Category>
}

// 刪除有文章的分類時，於對話框內挑選要轉移文章的目標分類
function TransferCategoryBody({
  postCount,
  options,
  onChange,
}: {
  postCount: number
  options: { id: string; name: string }[]
  onChange: (targetId: string) => void
}) {
  const [value, setValue] = useState('')

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        此分類底下還有 {postCount} 篇文章，請選擇要將這些文章轉移到的目標分類，
        完成轉移後才會刪除原分類。
      </p>
      <Select
        items={options.map((c) => ({ label: c.name, value: c.id }))}
        value={value}
        onValueChange={(next) => {
          const nextValue = (next as string) ?? ''
          setValue(nextValue)
          onChange(nextValue)
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="選擇目標分類" />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          {options.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function CategoriesRowActions({ row }: CategoriesRowActionsProps) {
  const { openAlertDialog, openDialog } = useOverlay()
  const category = row.original

  const { data: categoriesData } = useQuery(
    orpc.admin.category.getCategories.queryOptions()
  )

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
    const hasPosts = category.postCount > 0
    // 其他可作為轉移目標的分類（排除自己）
    const transferOptions =
      categoriesData?.data
        .filter((c) => c.id !== category.id)
        .map((c) => ({ id: c.id, name: c.name })) ?? []

    // 用 ref 保存使用者在對話框內選擇的目標分類，供 onConfirm 讀取
    const targetCategoryIdRef = { current: '' }

    openAlertDialog({
      id: `delete-category-${category.id}`,
      render: ({ isPending }) => ({
        title: `確定刪除分類「${category.name}」嗎？`,
        description: '此操作無法復原，刪除後相關資料可能受到影響。',
        body: hasPosts ? (
          <TransferCategoryBody
            postCount={category.postCount}
            options={transferOptions}
            onChange={(targetId) => {
              targetCategoryIdRef.current = targetId
            }}
          />
        ) : undefined,
        cancelLabel: '取消',
        confirmLabel: isPending ? '刪除中...' : '確定刪除',
        confirmVariant: 'destructive',
      }),
      onConfirm: async ({ close }) => {
        if (hasPosts && !targetCategoryIdRef.current) {
          toast.error('請先選擇要轉移文章的目標分類')
          return
        }

        try {
          const res = await deleteCategoryMutation.mutateAsync({
            id: category.id,
            targetCategoryId: hasPosts
              ? targetCategoryIdRef.current
              : undefined,
          })

          if (res.status === 'error') {
            toast.error(res.message ?? '刪除分類時發生錯誤，請稍後再試。')
            return
          }

          await queryClient.invalidateQueries({
            queryKey: orpc.admin.category.getCategories.queryOptions().queryKey,
          })
          // 文章的分類可能已轉移，連帶刷新文章列表
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
