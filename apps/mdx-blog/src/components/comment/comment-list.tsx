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

interface CommentListProps {
  comments: Comment[]
  sortOrder: CommentSortOrder
  onSortChange: (order: CommentSortOrder) => void
  // ✅ 移除 userVotes
  onLike: (commentId: string) => void
  onDislike: (commentId: string) => void
  onReply: (parentId: string, data: CommentFormValues) => void
}

export function CommentList({
  comments,
  sortOrder,
  onSortChange,
  onLike,
  onDislike,
  onReply,
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
        還沒有留言，成為第一個留言的人吧！
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
                  {sortOrder === 'newest' ? '最新優先' : '最舊優先'}
                </span>
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel>排序方式</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={sortOrder}
                onValueChange={(value) => onSortChange(value as CommentSortOrder)}
              >
                <DropdownMenuRadioItem value="newest">
                  <ClockIcon className="size-3.5" />
                  最新優先
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="oldest">
                  <HistoryIcon className="size-3.5" />
                  最舊優先
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
            // ✅ 不再傳 userVotes
            onLike={onLike}
            onDislike={onDislike}
            onReply={onReply}
          />
        ))}
      </div>
    </div>
  )
}