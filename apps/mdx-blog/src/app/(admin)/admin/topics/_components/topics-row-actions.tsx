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
import { useState } from 'react'
import { toast } from 'sonner'
import { updateTopics } from '../_actions/topics-actions'
import type { TopicItem } from '@/types/topic'
import { ApiResponse } from '@/types/api'
import Link from 'next/link'
import { TopicFormDialog } from './topic-form-dialog'

interface TopicsRowActionsProps {
  row: Row<TopicItem>
}

export function TopicsRowActions({ row }: TopicsRowActionsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const topic = row.original

  const handleDelete = async () => {
    console.log('Delete', topic?.id)
    setIsLoading(true)
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/admin/topics/${topic?.id}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      }
    )
    const data: ApiResponse<TopicItem> = await res.json()
    if (data.status === 'success') {
      // 成功後重新驗證專欄以更新列表
      await updateTopics()
      toast.success('專欄已刪除')
      setIsDeleteOpen(false)
    } else {
      console.error('Failed to delete topic:', data.message)
      toast.error('刪除專欄失敗，請稍後再試')
    }
    setIsLoading(false)
  }

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
            onClick={() => navigator.clipboard.writeText(topic.id)}
          >
            複製專欄 ID
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
            編輯專欄
          </DropdownMenuItem>
          <DropdownMenuItem render={
            <Link href={`/topics/${topic.slug}`} target="_blank">
              查看專欄
            </Link>
          } />
          <DropdownMenuSeparator />
          <AlertDialogTrigger nativeButton={false} render={
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              刪除專欄
            </DropdownMenuItem>
          } />
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>確定要刪除這個專欄嗎？</AlertDialogTitle>
          <AlertDialogDescription>
            此操作無法復原。這將永久刪除專欄「{topic.name}」及其相關數據。
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
              '刪除'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
      <TopicFormDialog
        mode="edit"
        topic={topic}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />
    </AlertDialog>
  )
}
