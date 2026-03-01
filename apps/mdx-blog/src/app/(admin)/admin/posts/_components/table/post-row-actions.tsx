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
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PostItem } from '@/types/post'
import { Loader2, MoreHorizontal } from 'lucide-react'
import { type Row } from '@tanstack/react-table'
import { useState } from 'react'
import { deletePosts } from '../../_actions/posts-actions'
import { toast } from 'sonner'
import Link from 'next/link'
import { updateTags } from '../../../tags/_actions/tags-actions'

interface PostRowActionsProps {
  row: Row<PostItem>
}

export function PostRowActions({ row }: PostRowActionsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const post = row.original

  const handleDelete = async () => {
    console.log('Delete post:', post?.id)
    setIsLoading(true)

    try {
      // const result = await deletePosts([post.id])

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/posts/${post.id}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      )
      const result = await res.json()

      if (result.status === 'success') {
        toast.success('文章已刪除')
        await updateTags()
        setIsOpen(false)
      } else {
        toast.error(result.error || '刪除失敗，請稍後再試')
      }
    } catch (error) {
      console.error('Failed to delete post:', error)
      toast.error('刪除失敗，請稍後再試')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger render={
          <Button
            variant="ghost"
            className="flex size-8 p-0 data-[state=open]:bg-muted"
          >
            <MoreHorizontal className="size-4" />
            <span className="sr-only">開啟選單</span>
          </Button>
        } />
        <DropdownMenuContent align="end" className="w-[160px]">
          <DropdownMenuGroup>
          <DropdownMenuLabel>更多操作</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => navigator.clipboard.writeText(post.id)}
          >
            複製文章 ID
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={
            <Link href={`/admin/posts/editor/${post.id}`}>編輯文章</Link>
          } />
          <DropdownMenuItem render={
            <Link href={`/posts/${post.slug}`} target="_blank">
              查看文章
            </Link>
          } />
          <DropdownMenuSeparator />
          <AlertDialogTrigger nativeButton={false} render={
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              刪除文章
            </DropdownMenuItem>
          } />
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>確定要刪除這篇文章嗎？</AlertDialogTitle>
          <AlertDialogDescription>
            此操作無法復原。這將永久刪除文章「{post.title}」及其相關數據。
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
                <Loader2 className="size-4 animate-spin mr-2" />
                正在刪除...
              </>
            ) : (
              '刪除'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
