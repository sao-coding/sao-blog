'use client'

import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@sao-blog/ui/components/dropdown-menu'
import { Loader2 } from 'lucide-react'
import { type Row } from '@tanstack/react-table'
import { toast } from 'sonner'
import { Link } from '@tanstack/react-router'
import type { InferClientOutputs } from '@orpc/client'
import type { client } from '@/utils/orpc'
import { ActionMenu } from '@/components/overlay/action-menu'
import { useOverlay } from '@/hooks/use-overlay'

type RouterOutputs = InferClientOutputs<typeof client>;
type Posts = RouterOutputs['admin']['post']['getPosts']['data']

interface PostRowActionsProps {
  row: Row<Posts[number]>
}

export function PostRowActions({ row }: PostRowActionsProps) {
  const { openAlertDialog } = useOverlay()
  const post = row.original

  const openDeletePostDialog = () => {
    openAlertDialog({
      id: `delete-post-${post.id}`,
      render: ({ isPending }) => ({
        title: `確定刪除文章「${post.title}」嗎？`,
        description: '此操作無法復原，刪除後將無法還原文章內容。',
        body: (
          <p className="text-xs text-muted-foreground">
            目前先接全域 Overlay，下一步可直接將 API 刪除請求接在 onConfirm。
          </p>
        ),
        cancelLabel: '取消',
        confirmLabel: isPending ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            刪除中...
          </span>
        ) : (
          '確定刪除'
        ),
        confirmVariant: 'destructive',
      }),
      onConfirm: async ({ close }) => {
        toast.success(`已觸發刪除流程（示範）：${post.title}`)
        close()
      },
    })
  }

  return (
    <ActionMenu
      triggerSrLabel="開啟文章操作"
      renderItems={() => (
        <>
          <DropdownMenuItem
            onClick={() => {
              navigator.clipboard.writeText(post.id)
              toast.success('已複製文章 ID')
            }}
          >
            複製文章 ID
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            render={
              <Link params={{ postId: post.id }} to="/posts/editor/$postId">
                編輯文章
              </Link>
            }
          />
          {/* TODO: 使用env 新增 主網域 */}
          <DropdownMenuItem
            render={
              <a href={`/posts/${post.slug}`} target="_blank" rel="noreferrer">
                查看文章
              </a>
            }
          />
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={openDeletePostDialog}>
            刪除文章
          </DropdownMenuItem>
        </>
      )}
    />
  )
}
