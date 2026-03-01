'use client'

import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { CategoryItem } from '@/types/category'
import { ColumnDef } from '@tanstack/react-table'
import dayjs from 'dayjs'
import { DataTableColumnHeader } from '@/app/(admin)/_components/table/table-column-header'
import { CategoriesRowActions } from '../categories-row-actions'

export const columns: ColumnDef<CategoryItem>[] = [
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
      return (
        <div className="flex space-x-2">
          <span className="max-w-[500px] truncate font-medium">
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
    accessorKey: 'postCount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="文章數" />
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
    cell: ({ row }) => <CategoriesRowActions row={row} />,
  },
]
