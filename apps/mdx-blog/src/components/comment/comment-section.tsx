'use client'

import { useState, useCallback, useRef } from 'react'
import { useInView } from 'motion/react'
import { MessageCircleIcon } from 'lucide-react'
import { toast } from 'sonner'
import { usePathname } from 'next/navigation'

import type { CommentSortOrder, FlatComment, VoteType } from '@/types/comment'
import type { CommentFormValues } from '@/schemas/comment'
import { orpc } from '@/lib/orpc'
import { cn } from '@/lib/utils'
import { countCommentsAndReplies } from './constants'
import { CommentForm } from './comment-form'
import { CommentList } from './comment-list'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { resolveRefType, toCommentTree } from '@/utils/comment'

// ── 型別 ─────────────────────────────────────────────────────────────────────

interface CommentSectionProps {
  postId: string
  lazyLoad?: boolean
  className?: string
}

// getComments API response 的 cache 型別
// 請依照你的實際 API response 型別調整
type CommentsCache = { data: FlatComment[] } | undefined

// ── CommentSection（lazy wrapper）────────────────────────────────────────────

export function CommentSection({ postId, lazyLoad = false, className }: CommentSectionProps) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(sentinelRef, { once: true, margin: '200px' })
  const shouldRender = !lazyLoad || isInView

  return (
    <div ref={sentinelRef} className={cn('w-full', className)}>
      {shouldRender ? (
        <CommentSectionContent postId={postId} />
      ) : (
        <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
          <MessageCircleIcon className="mr-2 size-4" />
          載入留言區中...
        </div>
      )}
    </div>
  )
}

// ── CommentSectionContent ────────────────────────────────────────────────────

function CommentSectionContent({ postId }: { postId: string }) {
  const pathname = usePathname()
  const refType = resolveRefType(pathname)
  const [sortOrder, setSortOrder] = useState<CommentSortOrder>('newest')
  const queryClient = useQueryClient()

  // ── 讀取留言 ──────────────────────────────────────────────────────────────

  const queryKey = orpc.comment.getComments.key({ input: { type: refType, refId: postId } })

  const { data: commentsResponse, isLoading, isError } = useQuery(
    orpc.comment.getComments.queryOptions({ input: { type: refType, refId: postId } })
  )

  const comments = toCommentTree(
    (commentsResponse?.data as FlatComment[] | undefined) ?? []
  )

  const { commentsCount, repliesCount } = countCommentsAndReplies(comments)

  // ── 新增留言 ──────────────────────────────────────────────────────────────

  const createCommentMutation = useMutation(
    orpc.comment.createComment.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey })
        toast.success('留言已送出！')
      },
      onError: () => toast.error('送出失敗，請稍後再試'),
    })
  )

  const handleSubmitComment = async (data: CommentFormValues) => {
    try {
      await createCommentMutation.mutateAsync({
        type: refType,
        refId: postId,
        displayUsername: data.displayUsername,
        email: data.email,
        source: 'guest',
        content: data.content,
      })
    } catch {
      // Toast is handled in mutation onError.
    }
  }

  const handleReply = async (parentId: string, data: CommentFormValues) => {
    try {
      await createCommentMutation.mutateAsync({
        type: refType,
        refId: postId,
        displayUsername: data.displayUsername,
        email: data.email,
        source: 'guest',
        content: data.content,
        thread: parentId,
      })
    } catch {
      // Toast is handled in mutation onError.
    }
  }

  // ── 按讚／倒讚（optimistic update via cache）─────────────────────────────
  //
  // 策略：
  //   onMutate  → 取 snapshot、直接修改 cache（立即反映 UI）
  //   onError   → 用 snapshot rollback
  //   onSettled → invalidate 讓 server 資料同步（success 也要 invalidate
  //               確保 likes 數字正確，但因為 optimistic 已更新，
  //               使用者感受不到 loading）

  const likeCommentMutation = useMutation({
    ...orpc.comment.likeComment.mutationOptions(),

    onMutate: async ({ id: commentId, like }: { id: string; like: boolean }) => {
      await queryClient.cancelQueries({ queryKey })
      const previousData = queryClient.getQueryData<CommentsCache>(queryKey)

      queryClient.setQueryData<CommentsCache>(queryKey, (old) => {
        if (!old?.data) return old
        return {
          ...old,
          data: old.data.map((comment) => {
            if (comment.id !== commentId) return comment

            if (like) {
              // toggle 按讚
              const toggled = !comment.liked
              return {
                ...comment,
                liked: toggled,
                likes: toggled ? comment.likes + 1 : comment.likes - 1,
              }
            } else {
              // 倒讚：API 目前無 disliked 狀態，只更新數字
              return {
                ...comment,
                dislikes: comment.dislikes + 1,
              }
            }
          }),
        }
      })

      return { previousData }
    },

    onError: (_err, _vars, context) => {
      // Rollback
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(queryKey, context.previousData)
      }
      toast.error('操作失敗，請稍後再試')
    },

    onSettled: () => {
      // 成功或失敗都 invalidate，確保最終與 server 同步
      queryClient.invalidateQueries({ queryKey })
    },
  })

  const handleLike = useCallback(
    (commentId: string) => likeCommentMutation.mutate({ id: commentId, like: true }),
    [likeCommentMutation]
  )

  const handleDislike = useCallback(
    (commentId: string) => likeCommentMutation.mutate({ id: commentId, like: false }),
    [likeCommentMutation]
  )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 mt-12">
      <div className="flex items-center gap-2">
        <MessageCircleIcon className="size-5 text-foreground" />
        <h2 className="text-lg font-semibold text-foreground">留言區</h2>
        <span className="text-sm text-muted-foreground">
          {commentsCount} 則留言
          {repliesCount > 0 && ` · ${repliesCount} 則回覆`}
        </span>
      </div>

      <CommentForm
        onSubmit={handleSubmitComment}
        isSubmitting={createCommentMutation.isPending}
      />

      {isLoading && <p className="text-sm text-muted-foreground">留言載入中...</p>}
      {isError && <p className="text-sm text-destructive">留言載入失敗，請稍後再試。</p>}

      <CommentList
        comments={comments}
        sortOrder={sortOrder}
        onSortChange={setSortOrder}
        onLike={handleLike}
        onDislike={handleDislike}
        onReply={handleReply}
      />
    </div>
  )
}