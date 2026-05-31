'use client'

import { Badge } from '@sao-blog/ui/components/badge'
import { Checkbox } from '@sao-blog/ui/components/checkbox'
import type { InferClientOutputs } from '@orpc/client'
import type { client } from '@/utils/orpc'
import type { ColumnDef } from '@tanstack/react-table'
import dayjs from 'dayjs'
import { DataTableColumnHeader } from '@/components/table/table-column-header'
import { TopicsRowActions } from './topics-row-actions'

type RouterOutputs = InferClientOutputs<typeof client>
export type Topic = RouterOutputs['admin']['topic']['getTopics']['data'][number]

export const columns: ColumnDef<Topic>[] = [
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
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="名稱" />
    ),
    cell: ({ row }) => {
      const color = row.original.color
      return (
        <div className="flex items-center gap-2">
          {color && (
            <span
              className="inline-block size-3 shrink-0 rounded-full"
              style={{ backgroundColor: color }}
              aria-hidden
            />
          )}
          <span className="max-w-[320px] truncate font-medium">
            {row.getValue('name')}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: 'slug',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="網址別名" />
    ),
  },
  {
    accessorKey: 'introduce',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="簡介" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground line-clamp-1 max-w-[360px]">
        {row.getValue('introduce')}
      </span>
    ),
  },
  {
    accessorKey: 'noteCount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="日記數" />
    ),
    cell: ({ row }) => (
      <Badge variant="secondary">{row.getValue('noteCount')}</Badge>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="建立時間" />
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
    accessorKey: 'updatedAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="更新時間" />
    ),
    cell: ({ row }) => {
      const date = dayjs(row.original.updatedAt).locale('zh-tw')
      return (
        <time dateTime={date.toISOString()}>
          {date.format('YYYY-MM-DD HH:mm')}
        </time>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => <TopicsRowActions row={row} />,
  },
]
