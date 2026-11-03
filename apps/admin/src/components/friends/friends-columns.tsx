'use client'

import { Badge } from '@sao-blog/ui/components/badge'
import { Checkbox } from '@sao-blog/ui/components/checkbox'
import type { InferClientOutputs } from '@orpc/client'
import type { client } from '@/utils/orpc'
import type { ColumnDef } from '@tanstack/react-table'
import dayjs from 'dayjs'
import { RssIcon } from 'lucide-react'
import { DataTableColumnHeader } from '@/components/table/table-column-header'
import { FriendsRowActions } from './friends-row-actions'

type RouterOutputs = InferClientOutputs<typeof client>
export type Friend = RouterOutputs['admin']['friend']['getFriends']['data'][number]
export type FriendStatus = Friend['status']

export const STATUS_META: Record<FriendStatus, { label: string; className: string }> = {
  pending: { label: '待審', className: 'border-amber-500/40 bg-amber-500/10 text-amber-400' },
  approved: { label: '已通過', className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' },
  rejected: { label: '已拒絕', className: 'border-destructive/40 bg-destructive/10 text-destructive' },
  hidden: { label: '已下架', className: 'border-border bg-muted text-muted-foreground' },
}

export const columns: ColumnDef<Friend>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && undefined)}
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
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="網站" />,
    cell: ({ row }) => (
      <div className="flex min-w-48 items-center gap-2.5">
        {row.original.avatar ? (
          <img
            src={row.original.avatar}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            className="size-8 shrink-0 rounded-full border object-cover"
          />
        ) : (
          <div className="size-8 shrink-0 rounded-full border bg-muted" />
        )}
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{row.getValue('name')}</span>
          <a
            href={row.original.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="truncate text-xs text-muted-foreground hover:underline"
          >
            {row.original.url}
          </a>
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'description',
    header: '介紹',
    cell: ({ row }) => (
      <div className="flex min-w-48 max-w-[320px] flex-col gap-1">
        <span className="line-clamp-2 text-sm">{row.original.description ?? '—'}</span>
        {row.original.email && <span className="truncate text-xs text-muted-foreground">{row.original.email}</span>}
      </div>
    ),
  },
  {
    accessorKey: 'status',
    header: ({ column }) => <DataTableColumnHeader column={column} title="審核" />,
    cell: ({ row }) => {
      const meta = STATUS_META[row.original.status]
      return (
        <div className="flex flex-col items-start gap-1">
          <Badge variant="outline" className={meta.className}>
            {meta.label}
          </Badge>
          {row.original.reviewNote && (
            <span className="line-clamp-2 max-w-40 text-xs text-muted-foreground">{row.original.reviewNote}</span>
          )}
        </div>
      )
    },
  },
  {
    id: 'circle',
    header: '朋友圈',
    cell: ({ row }) => {
      const f = row.original
      if (!f.circleEnabled) return <span className="text-muted-foreground">不加入</span>
      return (
        <div className="flex min-w-24 flex-col gap-0.5 text-xs">
          <span className="inline-flex items-center gap-1">
            <RssIcon className="size-3 text-muted-foreground" />
            {f.feedUrl ? '已設定 feed' : '自動發現'}
          </span>
          {f.fetchStatus === 'error' ? (
            <span className="text-destructive" title={f.fetchError ?? undefined}>
              抓取失敗 ×{f.failCount}
            </span>
          ) : f.lastFetchedAt ? (
            <span className="text-muted-foreground">{dayjs(f.lastFetchedAt).format('MM-DD HH:mm')} 抓取</span>
          ) : (
            <span className="text-muted-foreground">尚未抓取</span>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'group',
    header: ({ column }) => <DataTableColumnHeader column={column} title="分組 / 排序" />,
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-sm">
        {row.original.group} <span className="text-muted-foreground tabular-nums">#{row.original.sortOrder}</span>
      </span>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="申請時間" />,
    cell: ({ row }) => {
      const date = dayjs(row.original.createdAt)
      return (
        <time dateTime={date.toISOString()} className="whitespace-nowrap text-sm">
          {date.format('YYYY-MM-DD HH:mm')}
        </time>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => <FriendsRowActions row={row} />,
  },
]
