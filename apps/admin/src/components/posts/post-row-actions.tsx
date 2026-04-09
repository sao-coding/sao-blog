'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@sao-blog/ui/components/alert-dialog'
import { Button } from '@sao-blog/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@sao-blog/ui/components/dropdown-menu'
import { Loader2, MoreHorizontal } from 'lucide-react'
import { type Row } from '@tanstack/react-table'
import { useState } from 'react'
import { toast } from 'sonner'
import { Link } from '@tanstack/react-router'
import type { postSchema } from '@sao-blog/api/schema/post'
import type z from 'zod'
import type { InferClientOutputs } from '@orpc/client'
import type { client } from '@/utils/orpc'

type RouterOutputs = InferClientOutputs<typeof client>;
type Posts = RouterOutputs['admin']['post']['getPosts']['data']

interface PostRowActionsProps {
  row: Row<Posts[number]>
}

export function PostRowActions({ row }: PostRowActionsProps) {
  const post = row.original

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={
        <Button
          variant="ghost"
          className="flex size-8 p-0 data-[state=open]:bg-muted"
        >
          <MoreHorizontal className="size-4" />
          <span className="sr-only">開啟選單</span>
        </Button>
      } />
      <DropdownMenuContent align="end" className="w-[160px]">
        <DropdownMenuGroup>
          <DropdownMenuLabel>更多操作</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => navigator.clipboard.writeText(post.id)}
          >
            複製文章 ID
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={
            <Link params={{ postId: post.id }} to="/posts/editor/$postId">
              編輯文章
            </Link>
          } />
          {/* TODO: 使用env 新增 主網域 */}
          <DropdownMenuItem render={
            <a href={`/posts/${post.slug}`} target="_blank">
              查看文章
            </a>
          } />
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive focus:text-destructive">
            刪除文章 (尚未實作)
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
