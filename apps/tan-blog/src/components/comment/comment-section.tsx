'use client'

import { useState, useCallback, useRef } from 'react'
import { useInView } from 'motion/react'
import { LockIcon, MessageCircleIcon } from 'lucide-react'
import { toast } from '@sao-blog/ui/components/toast'
import { useLocation } from '@tanstack/react-router'

import type { CommentAction, CommentSortOrder, FlatComment } from '@/types/comment'
import type { CommentFormValues } from '@/schemas/comment'
import { client, orpc } from '@/lib/orpc'
import { authClient } from '@/lib/auth-client'
import { cn } from '@/lib/utils'
import { Button } from '@sao-blog/ui/components/button'
import { countCommentsAndReplies } from './constants'
import { CommentForm, type CommentGuardFields } from './comment-form'
import { CommentList, CommentSortToggle } from './comment-list'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { resolveRefType, toCommentTree } from '@/utils/comment'
import { m } from '#/paraglide/messages'

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
          {m.comment_section_loading()}
        </div>
      )}
    </div>
  )
}

function CommentSectionContent({ postId }: { postId: string }) {
  const pathname = useLocation({ select: (l) => l.pathname })
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

  const createCommentMutation = useMutation(orpc.comment.createComment.mutationOptions())

  /**
   * 送出留言 / 回覆。API 用 status: "error" 回報限流、驗證失敗、文章關閉留言等狀況（不會 throw），
   * 原本不管結果都顯示「已送出」；現在依回應顯示訊息，回傳 true 時表單才清空。
   */
  const submit = async (data: CommentFormValues, guard: CommentGuardFields, thread?: string) => {
    try {
      const res = await createCommentMutation.mutateAsync({
        type: refType,
        refId: postId,
        content: data.content,
        thread,
        hp: guard.hp,
        turnstileToken: guard.turnstileToken,
      })
      if (res.status !== 'success') {
        toast.add({ title: res.message || m.comment_send_failed(), type: 'error' })
        return false
      }
      await queryClient.invalidateQueries({ queryKey })
      const pending = 'data' in res && res.data?.status === 'pending'
      toast.add({
        title: pending ? m.comment_sent_pending() : m.comment_sent(),
        description: pending ? m.comment_sent_pending_description() : undefined,
        type: 'success',
      })
      return true
    } catch {
      toast.add({ title: m.comment_send_failed(), type: 'error' })
      return false
    }
  }

  const handleSubmitComment = (data: CommentFormValues, guard: CommentGuardFields) => submit(data, guard)
  const handleReply = (parentId: string, data: CommentFormValues, guard: CommentGuardFields) =>
    submit(data, guard, parentId)

  const likeCommentMutation = useMutation({
    ...orpc.comment.likeComment.mutationOptions(),

    // 介面只有愛心（like: true 為切換）；API 的倒讚（like: false）目前沒用到
    onMutate: async ({ id: commentId }: { id: string; like: boolean }) => {
      await queryClient.cancelQueries({ queryKey })
      const previousData = queryClient.getQueryData<CommentsCache>(queryKey)

      queryClient.setQueryData<CommentsCache>(queryKey, (old) => {
        if (!old?.data) return old
        return {
          ...old,
          data: old.data.map((comment) => {
            if (comment.id !== commentId) return comment
            const toggled = !comment.liked
            return { ...comment, liked: toggled, likes: toggled ? comment.likes + 1 : comment.likes - 1 }
          }),
        }
      })

      return { previousData }
    },

    onError: (_err, _vars, context) => {
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(queryKey, context.previousData)
      }
      toast.add({ title: m.comment_action_failed(), type: 'error' })
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  const handleLike = useCallback(
    (commentId: string) => likeCommentMutation.mutate({ id: commentId, like: true }),
    [likeCommentMutation]
  )

  const userName = session?.user.name ?? undefined
  const userImage = session?.user.image ?? null
  const currentUserId = session?.user.id
  // tan-blog 的 auth client 沒裝 admin plugin，role 不在型別裡，但 session 有回傳
  const role = (session?.user as { role?: string | null } | undefined)?.role
  const isAdmin = Boolean(role) && role !== 'user'

  /**
   * 留言的管理操作。站長走後台 API（置頂、隱藏、永久刪除）；
   * 一般使用者只能刪自己的留言（公開 API 的軟刪除）。審核相關（通過／垃圾／封鎖）留在後台。
   */
  const handleAction = async (commentId: string, action: CommentAction) => {
    try {
      const res =
        action.type === 'pin'
          ? await client.admin.comment.setCommentPin({ id: commentId, pin: action.value })
          : action.type === 'hide'
            ? await client.admin.comment.setCommentDeleted({ id: commentId, deleted: action.value })
            : isAdmin
              ? await client.admin.comment.deleteComment({ id: commentId })
              : await client.comment.deleteComment({ id: commentId })
      if (res.status !== 'success') {
        toast.add({ title: res.message || m.comment_action_failed(), type: 'error' })
        return
      }
      toast.add({ title: res.message || m.comment_action_done(), type: 'success' })
      await queryClient.invalidateQueries({ queryKey })
    } catch {
      toast.add({ title: m.comment_action_failed(), type: 'error' })
    }
  }

  return (
    <section className="mt-16 space-y-8" aria-labelledby="comment-section-title">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-dashed border-rule pb-5">
        {/* 朱印：留言＋回覆總數 */}
        <span className="comment-seal size-14 shrink-0 text-2xl tabular-nums" aria-hidden>
          {commentsCount + repliesCount}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="comment-section-title" className="font-wenkai text-2xl text-foreground">
            {m.comment_section_title()}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {m.comment_count({ count: String(commentsCount) })}
            {repliesCount > 0 && ` ${m.comment_reply_count({ count: String(repliesCount) })}`}
            <span className="hidden sm:inline"> — {m.comment_section_subtitle()}</span>
          </p>
        </div>
        {commentsCount > 1 && <CommentSortToggle value={sortOrder} onChange={setSortOrder} />}
      </header>

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

      {isLoading && <p className="text-sm text-muted-foreground">{m.comment_loading()}</p>}
      {isError && <p className="text-sm text-destructive">{m.comment_load_error()}</p>}

      <CommentList
        comments={comments}
        sortOrder={sortOrder}
        onLike={handleLike}
        onReply={handleReply}
        isAuthenticated={isAuthenticated}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        onAction={handleAction}
        userName={userName}
        userImage={userImage}
      />
    </section>
  )
}

function CommentLoginOverlay({ pathname }: { pathname: string }) {
  const handleLogin = (provider: 'github' | 'google') => {
    authClient.signIn.social({
      provider,
      callbackURL: `${window.location.origin}${pathname}`,
    })
  }

  return (
    <div className="flex flex-row-reverse items-start gap-3">
      {/* 虛線的「空位」頭像：位子留給你 */}
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-ink/40 text-ink">
        <LockIcon className="size-4" />
      </div>

      <div
        data-mine
        className="comment-bubble flex flex-1 flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="space-y-1">
          <p className="font-wenkai text-base text-foreground">{m.comment_login_gate_title()}</p>
          <p className="text-xs text-muted-foreground">{m.comment_login_gate_description()}</p>
        </div>

        <div className="flex shrink-0 gap-2">
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
