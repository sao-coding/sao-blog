'use client'

import { useMemo } from 'react'
import { MessagesSquareIcon } from 'lucide-react'

import type { Comment, CommentSortOrder } from '@/types/comment'
import type { CommentFormValues } from '@/schemas/comment'
import type { CommentGuardFields } from './comment-form'
import { cn } from '@/lib/utils'
import { CommentItem } from './comment-item'
import { m } from '#/paraglide/messages'

interface CommentListProps {
  comments: Comment[]
  sortOrder: CommentSortOrder
  onLike: (commentId: string) => void
  onReply: (parentId: string, data: CommentFormValues, guard: CommentGuardFields) => Promise<boolean>
  isAuthenticated?: boolean
  currentUserId?: string
  userName?: string
  userImage?: string | null
}

export function CommentList({
  comments,
  sortOrder,
  onLike,
  onReply,
  isAuthenticated = false,
  currentUserId,
  userName,
  userImage,
}: CommentListProps) {
  // 置頂留言永遠排最前，其餘依時間排序
  const sortedComments = useMemo(() => {
    return [...comments].sort((a, b) => {
      if (a.pin !== b.pin) return a.pin ? -1 : 1
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      return sortOrder === 'newest' ? -diff : diff
    })
  }, [comments, sortOrder])

  if (comments.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-ink-soft text-ink">
          <MessagesSquareIcon className="size-6" />
        </div>
        <p className="font-wenkai text-sm text-muted-foreground">{m.comment_empty()}</p>
      </div>
    )
  }

  return (
    <ol className="space-y-7">
      {sortedComments.map((comment) => (
        <li key={comment.id}>
          <CommentItem
            comment={comment}
            onLike={onLike}
            onReply={onReply}
            isAuthenticated={isAuthenticated}
            currentUserId={currentUserId}
            userName={userName}
            userImage={userImage}
          />
        </li>
      ))}
    </ol>
  )
}

/** 最新／最舊切換：兩個選項用分段按鈕比下拉選單直覺 */
export function CommentSortToggle({
  value,
  onChange,
}: {
  value: CommentSortOrder
  onChange: (order: CommentSortOrder) => void
}) {
  const options: { value: CommentSortOrder; label: string }[] = [
    { value: 'newest', label: m.comment_sort_newest() },
    { value: 'oldest', label: m.comment_sort_oldest() },
  ]

  return (
    <div
      role="radiogroup"
      aria-label={m.comment_sort_by()}
      className="inline-flex rounded-full border border-border bg-muted/60 p-0.5 text-xs"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-full px-3 py-1 text-muted-foreground transition-colors hover:text-foreground',
            value === option.value && 'bg-card text-foreground shadow-sm'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
