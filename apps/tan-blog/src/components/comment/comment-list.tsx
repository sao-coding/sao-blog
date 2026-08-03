'use client'

import { useMemo } from 'react'
import { ArrowUpDownIcon, ClockIcon, HistoryIcon } from 'lucide-react'

import type { Comment, CommentSortOrder } from '@/types/comment'  // ✅ 移除 VoteType
import type { CommentFormValues } from '@/schemas/comment'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu'
import { CommentItem } from './comment-item'
import { m } from '#/paraglide/messages'

interface CommentListProps {
  comments: Comment[]
  sortOrder: CommentSortOrder
  onSortChange: (order: CommentSortOrder) => void
  onLike: (commentId: string) => void
  onDislike: (commentId: string) => void
  onReply: (parentId: string, data: CommentFormValues) => void
  isAuthenticated?: boolean
  userName?: string
  userImage?: string | null
}

export function CommentList({
  comments,
  sortOrder,
  onSortChange,
  onLike,
  onDislike,
  onReply,
  isAuthenticated = false,
  userName,
  userImage,
}: CommentListProps) {
  const sortedComments = useMemo(() => {
    return [...comments].sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      return sortOrder === 'newest' ? -diff : diff
    })
  }, [comments, sortOrder])

  if (comments.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground text-sm">
        {m.comment_empty()}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                <ArrowUpDownIcon className="size-3.5" />
                <span className="text-xs">
                  {sortOrder === 'newest' ? m.comment_sort_newest() : m.comment_sort_oldest()}
                </span>
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel>{m.comment_sort_by()}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={sortOrder}
                onValueChange={(value) => onSortChange(value as CommentSortOrder)}
              >
                <DropdownMenuRadioItem value="newest">
                  <ClockIcon className="size-3.5" />
                  {m.comment_sort_newest()}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="oldest">
                  <HistoryIcon className="size-3.5" />
                  {m.comment_sort_oldest()}
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="divide-y divide-border">
        {sortedComments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            onLike={onLike}
            onDislike={onDislike}
            onReply={onReply}
            isAuthenticated={isAuthenticated}
            userName={userName}
            userImage={userImage}
          />
        ))}
      </div>
    </div>
  )
}