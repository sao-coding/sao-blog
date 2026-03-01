/**
 * 留言列表元件
 *
 * 包含排序下拉選單與留言項目列表。
 * 支援按時間倒序（最新在上）或正序排列。
 *
 * @module components/comment/comment-list
 */

'use client'

import { useMemo } from 'react'
import { ArrowUpDownIcon, ClockIcon, HistoryIcon } from 'lucide-react'

import type { Comment, CommentSortOrder, VoteType } from '@/types/comment'
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
  /** 留言陣列 */
  comments: Comment[]
  /** 當前排序方式 */
  sortOrder: CommentSortOrder
  /** 排序方式變更回調 */
  onSortChange: (order: CommentSortOrder) => void
  /** 使用者投票狀態表 */
  userVotes: Record<string, VoteType>
  /** 按讚回調 */
  onLike: (commentId: string) => void
  /** 倒讚回調 */
  onDislike: (commentId: string) => void
  /** 回覆回調 */
  onReply: (parentId: string, data: CommentFormValues) => void
}

/**
 * 留言列表
 *
 * 顯示排序選單與所有留言。
 * 留言按時間倒序（最新在上）為預設排序。
 *
 * @param props - 列表屬性
 * @returns 留言列表元件
 */
export function CommentList({
  comments,
  sortOrder,
  onSortChange,
  userVotes,
  onLike,
  onDislike,
  onReply,
}: CommentListProps) {
  /** 根據排序方式排列留言 */
  const sortedComments = useMemo(() => {
    const sorted = [...comments].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB
    })
    return sorted
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
      {/* 排序選單 */}
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
              onValueChange={(value) =>
                onSortChange(value as CommentSortOrder)
              }
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

      {/* 留言項目 */}
      <div className="divide-y divide-border">
        {sortedComments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            userVotes={userVotes}
            onLike={onLike}
            onDislike={onDislike}
            onReply={onReply}
          />
        ))}
      </div>
    </div>
  )
}
