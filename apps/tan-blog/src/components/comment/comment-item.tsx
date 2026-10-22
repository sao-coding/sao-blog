/**
 * 單則留言元件
 *
 * 以對話氣泡呈現：別人的留言靠左、自己的留言靠右（朱砂色調）。
 * 按讚／倒讚／回覆是貼在氣泡下緣的小膠囊；回覆串用彎折線連到上一層。
 * 支援遞迴渲染回覆的回覆。
 *
 * @module components/comment/comment-item
 */

'use client'

import { useState, useCallback } from 'react'
import {
  HeartIcon,
  ReplyIcon,
  ChevronUpIcon,
  ExternalLinkIcon,
  MapPinIcon,
  EllipsisIcon,
  PinIcon,
  PinOffIcon,
  EyeOffIcon,
  EyeIcon,
  Trash2Icon,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

import { cn } from '@/lib/utils'
import type { Comment, CommentAction } from '@/types/comment'
import { hasPinned } from '@/utils/comment'
import type { CommentFormValues } from '@/schemas/comment'
import { Avatar, AvatarFallback, AvatarImage } from '@sao-blog/ui/components/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@sao-blog/ui/components/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@sao-blog/ui/components/alert-dialog'
import { CommentMarkdownRenderer } from './comment-markdown-renderer'
import { CommentForm, type CommentGuardFields } from './comment-form'
import { dayjsLocale } from '@/lib/date-locale'
import { m } from '#/paraglide/messages'
import { siteTime } from '@/lib/site-time'

dayjs.extend(relativeTime)

interface CommentItemProps {
  comment: Comment
  onLike: (commentId: string) => void
  onReply: (parentId: string, data: CommentFormValues, guard: CommentGuardFields) => Promise<boolean>
  depth?: number
  isAuthenticated?: boolean
  currentUserId?: string
  isAdmin?: boolean
  onAction: (commentId: string, action: CommentAction) => Promise<void>
  userName?: string
  userImage?: string | null
}

/** 最大回覆巢狀深度 */
const MAX_DEPTH = 3

/** 回覆數不超過此值時預設展開，太多才摺疊 */
const AUTO_EXPAND_REPLIES = 2

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
 * 僅允許 http(s) 的網址，擋掉 javascript: / data: 等 XSS scheme。
 * @param website - 留言者填寫的網址
 * @returns 安全的網址，否則 undefined
 */
function safeWebsite(website?: string): string | undefined {
  if (!website) return undefined
  try {
    const url = new URL(website)
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.href
  } catch {
    // 非合法網址
  }
  return undefined
}

function CommentAvatar({ comment, small }: { comment: Comment; small?: boolean }) {
  return (
    <Avatar size={small ? 'sm' : 'default'} className={cn('shrink-0', !small && 'size-9')}>
      <AvatarImage src={comment.image || ''} alt={`${comment.displayUsername} 的頭像`} />
      <AvatarFallback
        style={{ backgroundColor: getAvatarColor(comment.displayUsername) }}
        className="font-semibold text-white"
      >
        {getInitial(comment.displayUsername)}
      </AvatarFallback>
    </Avatar>
  )
}

/** 氣泡下緣的操作膠囊按鈕 */
function PillButton({
  active,
  className,
  ...props
}: React.ComponentProps<'button'> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs text-muted-foreground transition-colors',
        'hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
        active && 'text-ink hover:text-ink',
        className
      )}
      {...props}
    />
  )
}

/**
 * 單則留言元件
 *
 * @param props - 留言元件屬性
 * @returns 留言元件
 */
export function CommentItem({
  comment,
  onLike,
  onReply,
  depth = 0,
  isAuthenticated = false,
  currentUserId,
  isAdmin = false,
  onAction,
  userName,
  userImage,
}: CommentItemProps) {
  const [showReplies, setShowReplies] = useState(
    // 串裡有置頂回覆時也直接展開，不然置頂等於沒作用
    () => comment.replies.length <= AUTO_EXPAND_REPLIES || comment.replies.some(hasPinned)
  )
  const [showReplyForm, setShowReplyForm] = useState(false)

  const hasReplies = comment.replies.length > 0
  const websiteHref = safeWebsite(comment.website)
  const isMine = !!currentUserId && comment.userId === currentUserId
  const isReply = depth > 0
  // 只有頂層的自己留言靠右；回覆串裡一律靠左，彎折線才接得上
  const alignRight = isMine && !isReply
  const created = siteTime(comment.createdAt)
  // 站長可管理所有留言；一般人只能刪自己還沒刪掉的留言
  const canManage = isAdmin || (isMine && !comment.deleted)
  const canInteract = !comment.deleted

  /** 處理回覆送出 */
  const handleReply = useCallback(
    async (data: CommentFormValues, guard: CommentGuardFields) => {
      const ok = await onReply(comment.id, data, guard)
      // 失敗時保留回覆框與內容，成功則展開回覆串讓人看到自己剛送出的回覆
      if (ok) {
        setShowReplyForm(false)
        setShowReplies(true)
      }
      return ok
    },
    [comment.id, onReply]
  )

  // 摺疊時顯示的頭像堆疊（不重複，最多三位）
  const replierStack = [
    ...new Map(comment.replies.map((r) => [r.displayUsername, r])).values(),
  ].slice(0, 3)

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <div className={cn('flex items-start gap-3', alignRight && 'flex-row-reverse')}>
        {/* 頭像下方的直線，往下接到回覆串的彎折線 */}
        <div className="flex flex-col items-center self-stretch">
          <CommentAvatar comment={comment} small={isReply} />
          {showReplies && hasReplies && !alignRight && (
            <span aria-hidden className="comment-rail mt-1 flex-1" />
          )}
        </div>

        <div
          className={cn(
            'flex min-w-0 max-w-[min(100%,40rem)] flex-1 flex-col',
            alignRight ? 'items-end' : 'items-start'
          )}
        >
          {/* 使用者資訊列 */}
          <div
            className={cn(
              'mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 px-1 text-xs text-muted-foreground',
              alignRight && 'flex-row-reverse'
            )}
          >
            <span className="text-sm font-medium text-foreground">{comment.displayUsername}</span>

            {comment.isAuthor && (
              <span className="comment-seal comment-seal-sm comment-seal-flat">{m.comment_author()}</span>
            )}

            {isMine && (
              <span className="rounded-full bg-ink-soft px-1.5 py-px text-[0.65rem] text-ink">
                {m.comment_you()}
              </span>
            )}

            {websiteHref && (
              <a
                href={websiteHref}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="hover:text-ink"
                aria-label={m.comment_website_aria({ name: comment.displayUsername })}
              >
                <ExternalLinkIcon className="size-3" />
              </a>
            )}

            {comment.pending && (
              <span className="rounded-full border border-dashed border-amber-500/50 px-1.5 py-px text-[0.65rem] text-amber-600 dark:text-amber-400">
                {m.comment_pending_badge()}
              </span>
            )}

            <time dateTime={comment.createdAt} title={created.format('YYYY-MM-DD HH:mm')}>
              {created.locale(dayjsLocale()).fromNow()}
            </time>

            {comment.location && (
              <span className="flex items-center gap-0.5">
                <MapPinIcon className="size-3" />
                {comment.location}
              </span>
            )}
          </div>

          {/* 氣泡本體 */}
          <div
            data-side={alignRight ? 'right' : 'left'}
            data-mine={isMine || undefined}
            className={cn(
              'comment-bubble max-w-full px-4 pt-3 pb-4',
              comment.pending && 'opacity-75',
              // 置頂印章壓在氣泡右上角，往下讓出空間才不會蓋到上面的名字和時間
              comment.pin && 'mt-2.5',
              isReply && 'px-3.5 pt-2.5 pb-3.5'
            )}
          >
            {comment.pin && (
              <span
                className={cn(
                  'comment-seal comment-seal-sm absolute -top-2.5 bg-background',
                  alignRight ? '-left-2' : '-right-2'
                )}
              >
                {m.comment_pinned()}
              </span>
            )}
            {comment.deleted ? (
              <p className="text-sm text-muted-foreground italic">{m.comment_deleted()}</p>
            ) : (
              <CommentMarkdownRenderer content={comment.content} />
            )}
          </div>

          {/* 操作膠囊：貼在氣泡下緣 */}
          {(canInteract || canManage) && (
            <div
              className={cn(
                'relative z-10 -mt-3 flex items-center gap-0.5 rounded-full border border-border bg-background p-0.5 shadow-sm',
                alignRight ? 'mr-3' : 'ml-3'
              )}
            >
              {canInteract && (
                <PillButton
                  active={comment.liked}
                  onClick={() => onLike(comment.id)}
                  aria-label={m.comment_like()}
                  aria-pressed={comment.liked}
                >
                  <HeartIcon
                    key={String(comment.liked)}
                    className={cn('size-3.5', comment.liked && 'comment-like-pop fill-current')}
                  />
                  {comment.likes > 0 && <span className="tabular-nums">{comment.likes}</span>}
                </PillButton>
              )}

              {/* 回覆按鈕（需登入且限制巢狀深度） */}
              {canInteract && isAuthenticated && depth < MAX_DEPTH && (
                <PillButton
                  active={showReplyForm}
                  onClick={() => setShowReplyForm((prev) => !prev)}
                  aria-expanded={showReplyForm}
                >
                  <ReplyIcon className="size-3.5" />
                  {m.comment_reply()}
                </PillButton>
              )}

              {canManage && (
                <CommentActionsMenu
                  comment={comment}
                  isAdmin={isAdmin}
                  onAction={(action) => onAction(comment.id, action)}
                />
              )}
            </div>
          )}

          {/* 回覆表單 */}
          <AnimatePresence initial={false}>
            {showReplyForm && (
              <motion.div
                key="reply-form"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                // 往外撐一點再 overflow-hidden，展開動畫時才不會切到氣泡的框線與陰影
                className="-mx-2 w-[calc(100%+1rem)] overflow-hidden px-2"
              >
                <div className="pt-3 pb-2">
                  <CommentForm
                    parentId={comment.id}
                    compact
                    onSubmit={handleReply}
                    onCancel={() => setShowReplyForm(false)}
                    userName={userName}
                    userImage={userImage}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 摺疊中的回覆：頭像堆疊 + 數量 */}
          {hasReplies && !showReplies && (
            <button
              type="button"
              onClick={() => setShowReplies(true)}
              className="mt-2.5 ml-1 inline-flex items-center gap-2 rounded-full py-0.5 pr-2.5 pl-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <span className="flex -space-x-1.5">
                {replierStack.map((r) => (
                  <span key={r.id} className="rounded-full ring-2 ring-background">
                    <CommentAvatar comment={r} small />
                  </span>
                ))}
              </span>
              {m.comment_show_replies({ count: String(comment.replies.length) })}
            </button>
          )}
        </div>
      </div>

      {/* 回覆串 */}
      <AnimatePresence initial={false}>
        {showReplies && hasReplies && (
          <motion.div
            key="replies"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="-mx-2 -mb-2 overflow-hidden px-2 pb-2"
          >
            <ol
              data-depth={isReply ? 'nested' : 'root'}
              className={cn('comment-thread space-y-5 pt-5', isReply ? 'ml-8' : 'ml-9')}
            >
              {comment.replies.map((reply) => (
                <li key={reply.id} className="comment-thread-item">
                  <CommentItem
                    comment={reply}
                    onLike={onLike}
                    onReply={onReply}
                    depth={depth + 1}
                    isAuthenticated={isAuthenticated}
                    currentUserId={currentUserId}
                    isAdmin={isAdmin}
                    onAction={onAction}
                    userName={userName}
                    userImage={userImage}
                  />
                </li>
              ))}
            </ol>
            {comment.replies.length > AUTO_EXPAND_REPLIES && (
              <button
                type="button"
                onClick={() => setShowReplies(false)}
                className={cn(
                  'mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground',
                  isReply ? 'ml-8' : 'ml-9'
                )}
              >
                <ChevronUpIcon className="size-3.5" />
                {m.comment_hide_replies()}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  )
}

/**
 * 「⋯」管理選單：站長可置頂／隱藏／永久刪除，一般人只能刪自己的留言。
 * 刪除一律先跳確認框。
 */
function CommentActionsMenu({
  comment,
  isAdmin,
  onAction,
}: {
  comment: Comment
  isAdmin: boolean
  onAction: (action: CommentAction) => Promise<void>
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const run = async (action: CommentAction) => {
    setBusy(true)
    try {
      await onAction(action)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<PillButton aria-label={m.comment_more_actions()} disabled={busy} />}
        >
          <EllipsisIcon className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-36">
          {isAdmin && (
            <>
              <DropdownMenuItem onClick={() => run({ type: 'pin', value: !comment.pin })}>
                {comment.pin ? <PinOffIcon /> : <PinIcon />}
                {comment.pin ? m.comment_unpin() : m.comment_pin()}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => run({ type: 'hide', value: !comment.deleted })}>
                {comment.deleted ? <EyeIcon /> : <EyeOffIcon />}
                {comment.deleted ? m.comment_restore() : m.comment_hide()}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem variant="destructive" onClick={() => setConfirmOpen(true)}>
            <Trash2Icon />
            {isAdmin ? m.comment_delete_forever() : m.comment_delete()}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{m.comment_delete_confirm_title()}</AlertDialogTitle>
            <AlertDialogDescription>
              {isAdmin ? m.comment_delete_forever_description() : m.comment_delete_confirm_description()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{m.comment_cancel()}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={busy}
              onClick={async () => {
                await run({ type: 'delete' })
                setConfirmOpen(false)
              }}
            >
              {isAdmin ? m.comment_delete_forever() : m.comment_delete()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
