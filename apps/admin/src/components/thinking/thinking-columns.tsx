'use client'

import { Badge } from '@sao-blog/ui/components/badge'
import { Checkbox } from '@sao-blog/ui/components/checkbox'
import type { InferClientOutputs } from '@orpc/client'
import type { client } from '@/utils/orpc'
import type { ColumnDef } from '@tanstack/react-table'
import dayjs from 'dayjs'
import { DataTableColumnHeader } from '@/components/table/table-column-header'
import { ThinkingRowActions } from './thinking-row-actions'

type RouterOutputs = InferClientOutputs<typeof client>
export type Thinking =
  RouterOutputs['admin']['thinking']['getThinkings']['data'][number]

export const columns: ColumnDef<Thinking>[] = [
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
    accessorKey: 'content',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="想法" />
    ),
    cell: ({ row }) => (
      <span className="line-clamp-2 max-w-[420px] whitespace-pre-wrap">
        {row.getValue('content')}
      </span>
    ),
    meta: { className: 'max-w-md' },
  },
  {
    accessorKey: 'noteId',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="日記" />
    ),
    cell: ({ row }) => {
      const noteId = row.getValue('noteId') as string | null
      return noteId ? (
        <a
          href={`/notes/${noteId}`}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-primary underline-offset-2 hover:underline"
        >
          /notes/{noteId.slice(0, 8)}…
        </a>
      ) : (
        <span className="text-muted-foreground">—</span>
      )
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="狀態" />
    ),
    cell: ({ row }) =>
      row.original.status ? (
        <Badge variant="secondary">已發表</Badge>
      ) : (
        <Badge variant="outline">草稿</Badge>
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
    id: 'actions',
    cell: ({ row }) => <ThinkingRowActions row={row} />,
  },
]
