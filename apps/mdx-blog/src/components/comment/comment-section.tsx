'use client'

import { useState, useCallback, useRef } from 'react'
import { useInView } from 'motion/react'
import { LockIcon, MessageCircleIcon } from 'lucide-react'
import { toast } from 'sonner'
import { usePathname } from 'next/navigation'

import type { CommentSortOrder, FlatComment } from '@/types/comment'
import type { CommentFormValues } from '@/schemas/comment'
import { orpc } from '@/lib/orpc'
import { authClient } from '@/lib/auth-client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { countCommentsAndReplies } from './constants'
import { CommentForm } from './comment-form'
import { CommentList } from './comment-list'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { resolveRefType, toCommentTree } from '@/utils/comment'

interface CommentSectionProps {
  postId: string
  lazyLoad?: boolean
  className?: string
}

type CommentsCache = { data: FlatComment[] } | undefined

export function CommentSection({ postId, lazyLoad = false, className }: CommentSectionProps) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(sentinelRef, { once: true, margin: '200px' })
  const shouldRender = !lazyLoad || isInView

  return (
    <div id="comment-section" ref={sentinelRef} className={cn('w-full', className)}>
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

function CommentSectionContent({ postId }: { postId: string }) {
  const pathname = usePathname()
  const refType = resolveRefType(pathname)
  const [sortOrder, setSortOrder] = useState<CommentSortOrder>('newest')
  const queryClient = useQueryClient()

  const { data: session, isPending: isSessionPending } = authClient.useSession()
  const isAuthenticated = !!session

  const queryKey = orpc.comment.getComments.key({ input: { type: refType, refId: postId } })

  const { data: commentsResponse, isLoading, isError } = useQuery(
    orpc.comment.getComments.queryOptions({ input: { type: refType, refId: postId } })
  )

  const comments = toCommentTree(
    (commentsResponse?.data as FlatComment[] | undefined) ?? []
  )

  const { commentsCount, repliesCount } = countCommentsAndReplies(comments)

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
        content: data.content,
        thread: parentId,
      })
    } catch {
      // Toast is handled in mutation onError.
    }
  }

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
              const toggled = !comment.liked
              return { ...comment, liked: toggled, likes: toggled ? comment.likes + 1 : comment.likes - 1 }
            } else {
              return { ...comment, dislikes: comment.dislikes + 1 }
            }
          }),
        }
      })

      return { previousData }
    },

    onError: (_err, _vars, context) => {
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(queryKey, context.previousData)
      }
      toast.error('操作失敗，請稍後再試')
    },

    onSettled: () => {
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

  const userName = session?.user.name ?? undefined
  const userImage = session?.user.image ?? null

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

      {/* 留言表單 / 登入提示 */}
      {isSessionPending ? null : isAuthenticated ? (
        <CommentForm
          onSubmit={handleSubmitComment}
          isSubmitting={createCommentMutation.isPending}
          userName={userName}
          userImage={userImage}
        />
      ) : (
        <CommentLoginOverlay pathname={pathname} />
      )}

      {isLoading && <p className="text-sm text-muted-foreground">留言載入中...</p>}
      {isError && <p className="text-sm text-destructive">留言載入失敗，請稍後再試。</p>}

      <CommentList
        comments={comments}
        sortOrder={sortOrder}
        onSortChange={setSortOrder}
        onLike={handleLike}
        onDislike={handleDislike}
        onReply={handleReply}
        isAuthenticated={isAuthenticated}
        userName={userName}
        userImage={userImage}
      />
    </div>
  )
}

function CommentLoginOverlay({ pathname }: { pathname: string }) {
  const handleLogin = (provider: 'github' | 'google') => {
    authClient.signIn.social({ provider, callbackURL: pathname })
  }

  return (
    <div className="relative rounded-xl overflow-hidden">
      {/* 背景模糊佔位（假表單） */}
      <div className="pointer-events-none select-none blur-sm opacity-30 space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="h-7 w-32 rounded-md bg-muted" />
        <div className="h-28 rounded-md bg-muted" />
        <div className="flex justify-between">
          <div className="h-8 w-20 rounded-md bg-muted" />
          <div className="h-8 w-24 rounded-md bg-muted" />
        </div>
      </div>

      {/* 毛玻璃遮罩 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-xl backdrop-blur-md bg-background/70 border border-border/50">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <LockIcon className="size-5 text-muted-foreground" />
        </div>

        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-foreground">登入後即可留言</p>
          <p className="text-xs text-muted-foreground">請使用第三方帳號快速登入</p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => handleLogin('github')}
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            GitHub
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => handleLogin('google')}
          >
            <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Google
          </Button>
        </div>
      </div>
    </div>
  )
}
