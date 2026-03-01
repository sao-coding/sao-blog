'use client'

import { useState } from 'react'
import { PostItem } from '@/types/post'
import { DataTableContainer } from '../../../../_components/table/table'
import { columns } from './posts-columns'
import { deletePosts } from '../../_actions/posts-actions'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface PostsTableWithActionsProps {
  data: PostItem[]
}

export function PostsTableWithActions({ data }: PostsTableWithActionsProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedPosts, setSelectedPosts] = useState<PostItem[]>([])
  const [isDeleting, setIsDeleting] = useState(false)

  const handleBatchDelete = (posts: PostItem[]) => {
    setSelectedPosts(posts)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (selectedPosts.length === 0) return

    setIsDeleting(true)

    try {
      const postIds = selectedPosts.map((post) => post.id)
      // const result = await deletePosts(postIds)

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/posts${postIds[0]}`,
        { method: 'DELETE' }
      )
      const result = await res.json()

      if (result.success) {
        toast.success(`成功刪除 ${selectedPosts.length} 篇文章`)
        setIsDeleteDialogOpen(false)
        setSelectedPosts([])
      } else {
        toast.error(result.error || '刪除失敗，請稍後再試')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('刪除失敗，請稍後再試')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <DataTableContainer
        columns={columns}
        searchColumnId="title"
        data={data}
        onBatchDelete={handleBatchDelete}
      />

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要刪除選中的文章嗎？</AlertDialogTitle>
            <AlertDialogDescription>
              您將要刪除 {selectedPosts.length}{' '}
              篇文章。此操作無法復原，這將永久刪除這些文章及其相關數據。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  正在刪除...
                </>
              ) : (
                '確定刪除'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
