'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Loader2Icon, MoreHorizontalIcon } from 'lucide-react'
import { type Row } from '@tanstack/react-table'
import { use, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { updateCategories } from '../_actions/categories-actions'
import type { CategoryItem } from '@/types/category'
import { ApiResponse } from '@/types/api'
import Link from 'next/link'
import { CategoryFormDialog } from './category-form-dialog'

interface CategoriesRowActionsProps {
  row: Row<CategoryItem>
}

export function CategoriesRowActions({ row }: CategoriesRowActionsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const category = row.original

  const handleDelete = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/categories/${category?.id}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      )
      const data: ApiResponse<null> = await res.json()
      if (data.status === 'success') {
        await updateCategories()
        toast.success('分類已刪除')
        setIsDeleteOpen(false)
      } else {
        toast.error(data.message || '刪除分類失敗，請稍後再試')
      }
    } catch (error) {
      toast.error('發生未知錯誤，請稍後再試。')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    console.log('CategoryFormDialog props:', { isEditDialogOpen, category })
  }, [isEditDialogOpen, category])

  return (
    <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger render={
          <Button
            variant="ghost"
            className="flex size-8 p-0 data-[state=open]:bg-muted"
          >
            <MoreHorizontalIcon className="size-4" />
            <span className="sr-only">開啟選單</span>
          </Button>
        } />
        <DropdownMenuContent align="end" className="w-[160px]">
          <DropdownMenuGroup>
          <DropdownMenuLabel>更多操作</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => navigator.clipboard.writeText(category.id)}
          >
            複製分類 ID
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault()
            }}
            onClick={() => {
              setIsEditDialogOpen(true)
            }}
            className="cursor-pointer"
          >
            編輯分類
          </DropdownMenuItem>
          <DropdownMenuItem render={
            <Link href={`/categories/${category.slug}`} target="_blank">
              查看分類
            </Link>
          } />
          <DropdownMenuSeparator />
          <AlertDialogTrigger nativeButton={false} render={
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              刪除分類
            </DropdownMenuItem>
            } /></DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>確定要刪除這個分類嗎？</AlertDialogTitle>
          <AlertDialogDescription>
            此操作無法復原。這將永久刪除分類「{category.name}」。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>取消</AlertDialogCancel>
          <Button
            onClick={handleDelete}
            variant="destructive"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2Icon className="size-4 animate-spin mr-2" />
                正在刪除...
              </>
            ) : (
              '確認刪除'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
      <CategoryFormDialog
        mode="edit"
        category={category}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />
    </AlertDialog>
  )
}
