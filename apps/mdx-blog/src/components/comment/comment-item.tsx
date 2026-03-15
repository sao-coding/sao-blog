/**
 * 單則留言元件
 *
 * 顯示留言內容、使用者資訊、按讚/倒讚、回覆功能。
 * 回覆預設為摺疊狀態，點擊展開。
 * 支援遞迴渲染回覆的回覆。
 *
 * @module components/comment/comment-item
 */

'use client'

import { useState, useCallback } from 'react'
import {
  ThumbsUpIcon,
  ThumbsDownIcon,
  MessageSquareIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-tw'

import { cn } from '@/lib/utils'
import type { Comment } from '@/types/comment'  // ✅ 移除 VoteType（不再需要）
import type { CommentFormValues } from '@/schemas/comment'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { CommentMarkdownRenderer } from './comment-markdown-renderer'
import { CommentForm } from './comment-form'

dayjs.extend(relativeTime)

interface CommentItemProps {
  /** 留言資料 */
  comment: Comment
  // ✅ 移除 userVotes：按讚狀態改由 comment.liked 提供
  /** 按讚回調 */
  onLike: (commentId: string) => void
  /** 倒讚回調 */
  onDislike: (commentId: string) => void
  /** 回覆回調 */
  onReply: (parentId: string, data: CommentFormValues) => void
  /** 巢狀深度（用於限制層級） */
  depth?: number
}

/** 最大回覆巢狀深度 */
const MAX_DEPTH = 3

/**
 * 取得暱稱的首字元作為 Avatar fallback
 * @param displayUsername - 使用者暱稱
 * @returns 大寫首字元
 */
function getInitial(displayUsername: string): string {
  return (displayUsername[0] || '?').toUpperCase()
}

/**
 * 根據暱稱生成穩定的背景色
 * @param displayUsername - 使用者暱稱
 * @returns HSL 色彩字串
 */
function getAvatarColor(displayUsername: string): string {
  let hash = 0
  for (let i = 0; i < displayUsername.length; i++) {
    hash = displayUsername.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash % 360)
  return `hsl(${hue}, 60%, 65%)`
}

/**
 * 單則留言元件
 *
 * 顯示使用者頭像、暱稱、時間、Markdown 內容。
 * 提供按讚、倒讚、回覆按鈕。
 * 回覆列表預設摺疊，點擊可展開，支援遞迴渲染。
 *
 * @param props - 留言元件屬性
 * @returns 留言元件
 */
export function CommentItem({
  comment,
  onLike,
  onDislike,
  onReply,
  depth = 0,
}: CommentItemProps) {
  const [showReplies, setShowReplies] = useState(false)
  const [showReplyForm, setShowReplyForm] = useState(false)

  const hasReplies = comment.replies.length > 0

  /** 處理回覆送出 */
  const handleReply = useCallback(
    (data: CommentFormValues) => {
      onReply(comment.id, data)
      setShowReplyForm(false)
    },
    [comment.id, onReply]
  )

  return (
    <div
      className={cn(
        'group/comment',
        depth > 0 && 'ml-6 border-l-2 border-border/50 pl-4 sm:ml-8 sm:pl-6'
      )}
    >
      <div className="flex gap-3 py-3">
        {/* 使用者頭像 */}
        <Avatar size="default" className="shrink-0">
          <AvatarFallback
            style={{ backgroundColor: getAvatarColor(comment.displayUsername) }}
            className="text-white font-semibold"
          >
            {getInitial(comment.displayUsername)}
          </AvatarFallback>
        </Avatar>

        {/* 留言主體 */}
        <div className="min-w-0 flex-1 space-y-1.5">
          {/* 使用者資訊列 */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              {comment.displayUsername}
            </span>

            {comment.website && (
              <a
                href={comment.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary"
                aria-label={`${comment.displayUsername} 的網站`}
              >
                <ExternalLinkIcon className="size-3" />
              </a>
            )}

            {comment.parentId && (
              <Badge variant="secondary" className="text-xs">回覆</Badge>
            )}

            <span className="text-xs text-muted-foreground">
              {dayjs(comment.createdAt).locale('zh-tw').fromNow()}
            </span>
          </div>

          {/* 留言內容 */}
          <CommentMarkdownRenderer content={comment.content} />

          {/* 操作按鈕列 */}
          <div className="flex items-center gap-1 pt-1">
            {/* 按讚：active 狀態由 comment.liked 決定 */}
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => onLike(comment.id)}
              className={cn(
                'gap-1 text-muted-foreground',
                comment.liked && 'text-primary'  // ✅ 改用 comment.liked
              )}
              aria-label="按讚"
            >
              <ThumbsUpIcon className="size-3.5" />
              {comment.likes > 0 && (
                <span className="text-xs">{comment.likes}</span>
              )}
            </Button>

            {/* 倒讚：API 目前無 disliked 欄位，不顯示 active 狀態 */}
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => onDislike(comment.id)}
              className="gap-1 text-muted-foreground"
              aria-label="倒讚"
            >
              <ThumbsDownIcon className="size-3.5" />
              {comment.dislikes > 0 && (
                <span className="text-xs">{comment.dislikes}</span>
              )}
            </Button>

            {/* 回覆按鈕（限制巢狀深度） */}
            {depth < MAX_DEPTH && (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setShowReplyForm((prev) => !prev)}
                className="gap-1 text-muted-foreground"
                aria-label="回覆"
              >
                <MessageSquareIcon className="size-3.5" />
                <span className="text-xs">回覆</span>
              </Button>
            )}

            {/* 展開/收合回覆 */}
            {hasReplies && (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setShowReplies((prev) => !prev)}
                className="gap-1 text-muted-foreground ml-auto"
              >
                {showReplies ? (
                  <ChevronDownIcon className="size-3.5" />
                ) : (
                  <ChevronRightIcon className="size-3.5" />
                )}
                <span className="text-xs">
                  {comment.replies.length} 則回覆
                </span>
              </Button>
            )}
          </div>

          {/* 回覆表單 */}
          <AnimatePresence>
            {showReplyForm && (
              <motion.div
                key="reply-form"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="pt-2">
                  <CommentForm
                    parentId={comment.id}
                    compact
                    onSubmit={handleReply}
                    onCancel={() => setShowReplyForm(false)}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 回覆列表（預設摺疊） */}
          <AnimatePresence>
            {showReplies && hasReplies && (
              <motion.div
                key="replies"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="pt-1">
                  {comment.replies.map((reply) => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      // ✅ 不再傳 userVotes
                      onLike={onLike}
                      onDislike={onDislike}
                      onReply={onReply}
                      depth={depth + 1}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}