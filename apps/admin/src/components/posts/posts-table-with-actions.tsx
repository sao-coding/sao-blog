'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { DataTableContainer } from '@/components/table/table'
import { columns } from './posts-columns'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@sao-blog/ui/components/alert-dialog'
import { Button } from '@sao-blog/ui/components/button'
import { Loader2 } from 'lucide-react'
import type { InferClientOutputs } from '@orpc/client'
import { orpc, queryClient, type client } from '@/utils/orpc'

type RouterOutputs = InferClientOutputs<typeof client>
type Posts = RouterOutputs['admin']['post']['getPosts']['data']
interface PostsTableWithActionsProps {
  data: Posts
  isLoading?: boolean
}

export function PostsTableWithActions({ data, isLoading }: PostsTableWithActionsProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedPosts, setSelectedPosts] = useState<Posts>([])

  // 原本直接 fetch `${API}/api/admin/posts${id}`：少了斜線、只送第一篇、沒帶登入 cookie，
  // 回應格式也對不上（判斷 result.success），批次刪除一直會失敗。改用 oRPC 的 deletePosts。
  const deletePostsMutation = useMutation(orpc.admin.post.deletePosts.mutationOptions())

  const handleBatchDelete = (posts: Posts) => {
    setSelectedPosts(posts)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (selectedPosts.length === 0) return

    try {
      const res = await deletePostsMutation.mutateAsync({ ids: selectedPosts.map((post) => post.id) })
      if (res.status !== 'success') {
        toast.error(res.message || '刪除失敗，請稍後再試')
        return
      }
      await queryClient.invalidateQueries({ queryKey: orpc.admin.post.key() })
      toast.success(`成功刪除 ${selectedPosts.length} 篇文章`)
      setIsDeleteDialogOpen(false)
      setSelectedPosts([])
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('刪除失敗，請稍後再試')
    }
  }

  return (
    <>
      <DataTableContainer
        columns={columns}
        searchColumnId="title"
        data={data}
        onBatchDelete={handleBatchDelete}
        isLoading={isLoading}
        emptyDescription="還沒有文章，按右上角「新增文章」開始寫第一篇。"
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要刪除選中的文章嗎？</AlertDialogTitle>
            <AlertDialogDescription>
              您將要刪除 {selectedPosts.length}{' '}
              篇文章。此操作無法復原，這將永久刪除這些文章及其相關數據。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePostsMutation.isPending}>取消</AlertDialogCancel>
            <Button variant="destructive" onClick={confirmDelete} disabled={deletePostsMutation.isPending}>
              {deletePostsMutation.isPending ? (
                <>
                  <Loader2 className="animate-spin" />
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
