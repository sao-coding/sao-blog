'use client'

import { Badge } from '@sao-blog/ui/components/badge'
import { Checkbox } from '@sao-blog/ui/components/checkbox'
import { Tooltip, TooltipContent, TooltipTrigger } from '@sao-blog/ui/components/tooltip'
import type { InferClientOutputs } from '@orpc/client'
import type { client } from '@/utils/orpc'
import type { ColumnDef } from '@tanstack/react-table'
import dayjs from 'dayjs'
import { CornerDownRightIcon, EyeOffIcon, MapPinIcon, PinIcon } from 'lucide-react'
import { DataTableColumnHeader } from '@/components/table/table-column-header'
import { CommentsRowActions } from './comments-row-actions'

type RouterOutputs = InferClientOutputs<typeof client>
export type Comment =
  RouterOutputs['admin']['comment']['getComments']['data'][number]
export type CommentStatus = Comment['status']

const REF_TYPE_LABELS: Record<string, string> = {
  post: '文章',
  note: '日記',
  page: '頁面',
  recently: '動態',
}

const SOURCE_LABELS: Record<string, string> = {
  credential: '帳密',
  google: 'Google',
  github: 'GitHub',
}

export const STATUS_META: Record<CommentStatus, { label: string; className: string }> = {
  pending: { label: '待審', className: 'border-amber-500/40 bg-amber-500/10 text-amber-400' },
  approved: { label: '已通過', className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' },
  spam: { label: '垃圾', className: 'border-destructive/40 bg-destructive/10 text-destructive' },
  rejected: { label: '已拒絕', className: 'border-border bg-muted text-muted-foreground' },
}

/** 自動判定的原因（lib/comment-guard.ts 的 flagReason） */
const FLAG_REASONS: Record<string, string> = {
  'first-comment': '第一次留言',
  'new-account': '新帳號',
  links: '連結太多',
  keyword: '命中關鍵字',
  blocked: '已封鎖來源',
}

export const columns: ColumnDef<Comment>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && undefined)
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="全選"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="選擇行"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'displayUsername',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="留言者" />
    ),
    cell: ({ row }) => (
      <div className="flex min-w-36 items-center gap-2">
        {row.original.pin && (
          <PinIcon className="size-3.5 shrink-0 text-primary" aria-label="已置頂" />
        )}
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{row.getValue('displayUsername')}</span>
          <span className="truncate text-xs text-muted-foreground">
            {row.original.email} · {SOURCE_LABELS[row.original.source] ?? row.original.source}
          </span>
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'content',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="內容" />
    ),
    cell: ({ row }) => (
      <div className="flex min-w-56 max-w-[420px] flex-col gap-1">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Badge variant="outline" className="h-4 px-1 text-[10px]">
            {REF_TYPE_LABELS[row.original.refType] ?? row.original.refType}
          </Badge>
          {row.original.thread && (
            <span className="inline-flex items-center gap-0.5">
              <CornerDownRightIcon className="size-3" />
              回覆
            </span>
          )}
          {row.original.deleted && (
            <span className="inline-flex items-center gap-0.5">
              <EyeOffIcon className="size-3" />
              已隱藏
            </span>
          )}
        </span>
        <span className={row.original.deleted ? 'line-clamp-3 text-muted-foreground line-through' : 'line-clamp-3'}>
          {row.getValue('content')}
        </span>
      </div>
    ),
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="審核" />
    ),
    cell: ({ row }) => {
      const meta = STATUS_META[row.original.status]
      const reason = row.original.flagReason
      return (
        <div className="flex flex-col items-start gap-1">
          <Badge variant="outline" className={meta.className}>
            {meta.label}
          </Badge>
          {reason && (
            <span className="text-xs text-muted-foreground">{FLAG_REASONS[reason] ?? reason}</span>
          )}
        </div>
      )
    },
  },
  {
    id: 'origin',
    header: '來源位置',
    cell: ({ row }) =>
      row.original.ip || row.original.location ? (
        <Tooltip>
          <TooltipTrigger render={<span className="flex min-w-24 cursor-default flex-col" />}>
            <span className="inline-flex items-center gap-1 text-sm">
              <MapPinIcon className="size-3 text-muted-foreground" />
              {row.original.location ?? '未知'}
            </span>
            <span className="font-mono text-xs text-muted-foreground">{row.original.ip ?? '—'}</span>
          </TooltipTrigger>
          {row.original.agent && <TooltipContent className="max-w-sm">{row.original.agent}</TooltipContent>}
        </Tooltip>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: 'reactions',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="讚 / 倒讚" />
    ),
    cell: ({ row }) => (
      <span className="text-sm tabular-nums">
        {row.original.likes} / {row.original.dislikes}
      </span>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="留言時間" />
    ),
    cell: ({ row }) => {
      const date = dayjs(row.original.createdAt).locale('zh-tw')
      return (
        <time dateTime={date.toISOString()} className="whitespace-nowrap text-sm">
          {date.format('YYYY-MM-DD HH:mm')}
        </time>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => <CommentsRowActions row={row} />,
  },
]
