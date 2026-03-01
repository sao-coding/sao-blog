'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { ColumnDef } from '@tanstack/react-table'
import dayjs from 'dayjs'
import { DataTableColumnHeader } from '@/app/(admin)/_components/table/table-column-header'
import { TopicItem } from '@/types/topic'
import { TopicsRowActions } from '../topics-row-actions'

export const columns: ColumnDef<TopicItem>[] = [
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
      const topic = row.original
      return <span className="ml-2 font-medium">{topic.name}</span>
    },
  },
  {
    accessorKey: 'slug',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="網址別名" />
    ),
  },
  {
    accessorKey: 'noteCount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="筆記數" />
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
