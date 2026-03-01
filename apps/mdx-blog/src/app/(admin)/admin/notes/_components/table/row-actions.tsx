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
import { NoteItem } from '@/types/note'
import { Loader2, MoreHorizontal } from 'lucide-react'
import { type Row } from '@tanstack/react-table'
import { useState } from 'react'
import { deleteNote } from '../../_actions/notes-actions'
import { toast } from 'sonner'
import Link from 'next/link'
import { notesUpdate } from '../../_actions/notes-actions'

interface RowActionsProps {
  row: Row<NoteItem>
}

export function RowActions({ row }: RowActionsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const note = row.original

  const handleDelete = async () => {
    console.log('Delete note:', note?.id)
    setIsLoading(true)

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/notes/${note.id}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      )
      const result = await res.json()

      if (result.status === 'success') {
        toast.success('日記已刪除')
        await notesUpdate()
        setIsOpen(false)
      } else {
        toast.error(result.error || '刪除失敗，請稍後再試')
      }
    } catch (error) {
      console.error('Failed to delete note:', error)
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
            onClick={() => navigator.clipboard.writeText(note.id)}
          >
            複製日記 ID
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={
            <Link href={`/admin/notes/editor/${note.id}`}>編輯日記</Link>
          } />
          <DropdownMenuItem render={
            <Link href={`/notes/${note.id}`} target="_blank">
              查看日記
            </Link>
          } />
          <DropdownMenuSeparator />
          <AlertDialogTrigger nativeButton={false} render={
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              刪除日記
            </DropdownMenuItem>
          } /></DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>確定要刪除這篇日記嗎？</AlertDialogTitle>
          <AlertDialogDescription>
            此操作無法復原。這將永久刪除日記「{note.title}」及其相關數據。
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
