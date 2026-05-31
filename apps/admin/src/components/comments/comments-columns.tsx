'use client'

import { Badge } from '@sao-blog/ui/components/badge'
import { Checkbox } from '@sao-blog/ui/components/checkbox'
import type { InferClientOutputs } from '@orpc/client'
import type { client } from '@/utils/orpc'
import type { ColumnDef } from '@tanstack/react-table'
import dayjs from 'dayjs'
import { PinIcon } from 'lucide-react'
import { DataTableColumnHeader } from '@/components/table/table-column-header'
import { CommentsRowActions } from './comments-row-actions'

type RouterOutputs = InferClientOutputs<typeof client>
export type Comment =
  RouterOutputs['admin']['comment']['getComments']['data'][number]

const REF_TYPE_LABELS: Record<string, string> = {
  post: '文章',
  note: '日記',
  page: '頁面',
  recently: '動態',
}

const SOURCE_LABELS: Record<string, string> = {
  guest: '訪客',
  google: 'Google',
  github: 'GitHub',
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
      <div className="flex items-center gap-2">
        {row.original.pin && (
          <PinIcon
            className="size-3.5 shrink-0 text-primary"
            aria-label="已置頂"
          />
        )}
        <div className="flex flex-col">
          <span className="font-medium">{row.getValue('displayUsername')}</span>
          <span className="text-xs text-muted-foreground">
            {row.original.email}
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
      <span
        className={
          row.original.deleted
            ? 'line-clamp-2 max-w-[360px] text-muted-foreground line-through'
            : 'line-clamp-2 max-w-[360px]'
        }
      >
        {row.getValue('content')}
      </span>
    ),
    meta: { className: 'max-w-sm' },
  },
  {
    accessorKey: 'refType',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="類型" />
    ),
    cell: ({ row }) => {
      const refType = row.getValue('refType') as string
      return <Badge variant="outline">{REF_TYPE_LABELS[refType] ?? refType}</Badge>
    },
  },
  {
    accessorKey: 'source',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="來源" />
    ),
    cell: ({ row }) => {
      const source = row.getValue('source') as string
      return (
        <span className="text-sm text-muted-foreground">
          {SOURCE_LABELS[source] ?? source}
        </span>
      )
    },
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
    accessorKey: 'deleted',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="狀態" />
    ),
    cell: ({ row }) =>
      row.original.deleted ? (
        <Badge variant="destructive">已隱藏</Badge>
      ) : (
        <Badge variant="secondary">顯示中</Badge>
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
        <time dateTime={date.toISOString()}>
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
