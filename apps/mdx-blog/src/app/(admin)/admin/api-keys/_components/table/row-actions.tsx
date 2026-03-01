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
import { Button, buttonVariants } from '@/components/ui/button'
import type { ApiKey } from '@/types/api-key'
import { Loader2Icon, TrashIcon } from 'lucide-react'
import { type Row } from '@tanstack/react-table'
import { useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { updateApiKeys } from '../../_actions/api-keys-actions'
import { toast } from 'sonner'

interface RowActionsProps {
  row: Row<ApiKey>
}

export function RowActions({ row }: RowActionsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const r = row.original

  const handleDelete = async () => {
    console.log('Delete', r?.id)
    setIsLoading(true)
    const { data, error } = await authClient.apiKey.delete({
      keyId: r?.id, // required
    })
    if (data?.success) {
      // 成功後重新驗證標籤以更新列表
      await updateApiKeys()
      toast.success('API 金鑰已刪除')
      setIsOpen(false)
    } else {
      console.error('Failed to delete API key:', error)
      toast.error('刪除 API 金鑰失敗，請稍後再試')
    }
    setIsLoading(false)
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger render={
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
        >
          <TrashIcon className="h-4 w-4" />
          <span className="sr-only">刪除 API 金鑰</span>
        </Button>
      } />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>確定要刪除嗎？</AlertDialogTitle>
          <AlertDialogDescription>
            此操作無法復原。這將永久刪除此 API 金鑰。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <Button onClick={handleDelete} variant="destructive">
            {isLoading ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
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
