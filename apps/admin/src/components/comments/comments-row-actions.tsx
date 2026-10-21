'use client'

import { useState } from 'react'
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@sao-blog/ui/components/dropdown-menu'
import { Textarea } from '@sao-blog/ui/components/textarea'
import { type Row } from '@tanstack/react-table'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import {
  BanIcon,
  CheckIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  MessageSquareReplyIcon,
  PinIcon,
  ShieldAlertIcon,
  Trash2Icon,
  Undo2Icon,
  UserSearchIcon,
  XIcon,
} from 'lucide-react'
import { ActionMenu } from '@/components/overlay/action-menu'
import { useOverlay } from '@/hooks/use-overlay'
import { useMutation } from '@tanstack/react-query'
import { orpc, queryClient } from '@/utils/orpc'
import type { Comment, CommentStatus } from './comments-columns'

interface CommentsRowActionsProps {
  row: Row<Comment>
}

/** 留言相關的查詢（列表、各狀態數量、儀表板）全部重抓 */
export const invalidateComments = () =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: orpc.admin.comment.key() }),
    queryClient.invalidateQueries({ queryKey: orpc.admin.dashboard.key() }),
  ])

/** 回覆框（以管理員身分回覆，直接公開） */
function ReplyBody({ onChange }: { onChange: (v: string) => void }) {
  const [value, setValue] = useState('')
  return (
    <Textarea
      autoFocus
      rows={5}
      placeholder="輸入回覆內容（支援 Markdown）"
      value={value}
      onChange={(e) => {
        setValue(e.target.value)
        onChange(e.target.value)
      }}
    />
  )
}

export function CommentsRowActions({ row }: CommentsRowActionsProps) {
  const { openAlertDialog, openDialog } = useOverlay()
  const navigate = useNavigate()
  const comment = row.original

  const statusMutation = useMutation(orpc.admin.comment.setCommentStatus.mutationOptions())
  const replyMutation = useMutation(orpc.admin.comment.replyComment.mutationOptions())
  const blockMutation = useMutation(orpc.admin.comment.blockFromComment.mutationOptions())
  const deleteCommentMutation = useMutation(orpc.admin.comment.deleteComment.mutationOptions())
  const setDeletedMutation = useMutation(orpc.admin.comment.setCommentDeleted.mutationOptions())
  const setPinMutation = useMutation(orpc.admin.comment.setCommentPin.mutationOptions())

  const run = async (action: () => Promise<{ status: string; message: string }>) => {
    try {
      const res = await action()
      if (res.status !== 'success') {
        toast.error(res.message)
        return
      }
      await invalidateComments()
      toast.success(res.message)
    } catch {
      toast.error('操作失敗，請稍後再試。')
    }
  }

  const setStatus = (status: CommentStatus) => () =>
    run(() => statusMutation.mutateAsync({ ids: [comment.id], status }))

  const openReplyDialog = () => {
    let content = ''
    openDialog({
      id: `reply-comment-${comment.id}`,
      render: ({ isPending }) => ({
        title: `回覆 ${comment.displayUsername}`,
        description: comment.status === 'approved' ? '回覆會直接公開。' : '回覆會直接公開，這則留言也會一併通過審核。',
        body: (
          <div className="space-y-3">
            <blockquote className="line-clamp-4 border-l-2 pl-3 text-sm text-muted-foreground">{comment.content}</blockquote>
            <ReplyBody onChange={(v) => (content = v)} />
          </div>
        ),
        confirmLabel: isPending ? '送出中…' : '送出回覆',
      }),
      onConfirm: async ({ close }) => {
        if (!content.trim()) {
          toast.error('回覆內容不可為空')
          return
        }
        await run(() => replyMutation.mutateAsync({ id: comment.id, content }))
        close()
      },
    })
  }

  const openBlockDialog = (type: 'ip' | 'email') => {
    const value = type === 'ip' ? comment.ip : comment.email
    openAlertDialog({
      id: `block-${type}-${comment.id}`,
      render: ({ isPending }) => ({
        title: `封鎖這個${type === 'ip' ? ' IP' : ' Email'}？`,
        description: `${value} 之後送出的留言會被直接擋下；這則留言和他還在待審的留言會標成垃圾。可以在「安全設定」的封鎖清單解除。`,
        confirmLabel: isPending ? '封鎖中…' : '封鎖',
        confirmVariant: 'destructive',
      }),
      onConfirm: async ({ close }) => {
        await run(() => blockMutation.mutateAsync({ id: comment.id, type }))
        close()
      },
    })
  }

  const openDeleteCommentDialog = () => {
    openAlertDialog({
      id: `delete-comment-${comment.id}`,
      render: ({ isPending }) => ({
        title: '確定永久刪除這則留言嗎？',
        description: '此操作無法復原，留言將從資料庫中徹底移除。',
        cancelLabel: '取消',
        confirmLabel: isPending ? '刪除中...' : '確定刪除',
        confirmVariant: 'destructive',
      }),
      onConfirm: async ({ close }) => {
        await run(() => deleteCommentMutation.mutateAsync({ id: comment.id }))
        close()
      },
    })
  }

  return (
    <ActionMenu
      triggerSrLabel="開啟留言操作"
      widthClassName="w-52"
      label="審核"
      renderItems={() => (
        <>
          {comment.status !== 'approved' && (
            <DropdownMenuItem onClick={setStatus('approved')}>
              <CheckIcon />
              通過
            </DropdownMenuItem>
          )}
          {comment.status !== 'spam' && (
            <DropdownMenuItem onClick={setStatus('spam')}>
              <ShieldAlertIcon />
              標為垃圾
            </DropdownMenuItem>
          )}
          {comment.status !== 'rejected' && (
            <DropdownMenuItem onClick={setStatus('rejected')}>
              <XIcon />
              拒絕
            </DropdownMenuItem>
          )}
          {comment.status !== 'pending' && (
            <DropdownMenuItem onClick={setStatus('pending')}>
              <Undo2Icon />
              退回待審
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={openReplyDialog}>
            <MessageSquareReplyIcon />
            回覆
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel>留言者</DropdownMenuLabel>
          {comment.userId && (
            <DropdownMenuItem
              onClick={() => navigate({ to: '/comments', search: { status: undefined, user: comment.userId ?? undefined } })}
            >
              <UserSearchIcon />
              只看這個人的留言
            </DropdownMenuItem>
          )}
          {comment.ip && (
            <DropdownMenuItem onClick={() => openBlockDialog('ip')}>
              <BanIcon />
              封鎖 IP
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => openBlockDialog('email')}>
            <BanIcon />
            封鎖 Email
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => run(() => setPinMutation.mutateAsync({ id: comment.id, pin: !comment.pin }))}
          >
            <PinIcon />
            {comment.pin ? '取消置頂' : '置頂'}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => run(() => setDeletedMutation.mutateAsync({ id: comment.id, deleted: !comment.deleted }))}
          >
            {comment.deleted ? <EyeIcon /> : <EyeOffIcon />}
            {comment.deleted ? '還原' : '隱藏內容'}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              navigator.clipboard.writeText(comment.id)
              toast.success('已複製留言 ID')
            }}
          >
            <CopyIcon />
            複製 ID
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={openDeleteCommentDialog}>
            <Trash2Icon />
            永久刪除
          </DropdownMenuItem>
        </>
      )}
    />
  )
}
