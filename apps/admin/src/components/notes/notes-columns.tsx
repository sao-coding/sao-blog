'use client'

import type { InferClientOutputs } from '@orpc/client'
import { Badge } from '@sao-blog/ui/components/badge'
import { Checkbox } from '@sao-blog/ui/components/checkbox'
import { cn } from '@sao-blog/ui/lib/utils'
import type { ColumnDef } from '@tanstack/react-table'
import { Link } from '@tanstack/react-router'
import dayjs from 'dayjs'
import { moodMap, weatherMap } from '@/config/note'
import { DataTableColumnHeader } from '@/components/table/table-column-header'
import { NoteRowActions } from './note-row-actions'
import type { client } from '@/utils/orpc'

type RouterOutputs = InferClientOutputs<typeof client>
type Notes = RouterOutputs['admin']['note']['getNotes']['data']

export const columns: ColumnDef<Notes[number]>[] = [
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
    meta: {
      className: cn(
        'sticky md:table-cell left-0 z-10 rounded-tl',
        'bg-background transition-colors duration-200 group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted'
      ),
    },
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
    accessorKey: 'title',
    header: ({ column }) => <DataTableColumnHeader column={column} title="標題" />,
    cell: ({ row }) => {
      const note = row.original

      return (
        <Link
          params={{ noteId: note.id }}
          to="/notes/editor/$noteId"
          className="hover:underline flex items-center"
        >
          <span className="ml-2 w-40 truncate">{note.title}</span>
        </Link>
      )
    },
  },
  {
    accessorKey: 'mood',
    header: ({ column }) => <DataTableColumnHeader column={column} title="心情" />,
    cell: ({ row }) => {
      const note = row.original

      return (
        <div className="px-1">
          <Badge className={moodMap[note.mood]?.color}>
            {moodMap[note.mood]?.label ?? note.mood}
          </Badge>
        </div>
      )
    },
  },
  {
    accessorKey: 'weather',
    header: ({ column }) => <DataTableColumnHeader column={column} title="天氣" />,
    cell: ({ row }) => {
      const note = row.original

      return (
        <div className="px-1">
          <Badge className={weatherMap[note.weather]?.color}>
            {weatherMap[note.weather]?.label ?? note.weather}
          </Badge>
        </div>
      )
    },
  },
  {
    accessorKey: 'bookmark',
    header: ({ column }) => <DataTableColumnHeader column={column} title="收藏" />,
    cell: ({ row }) => {
      const note = row.original

      return (
        <div className="px-1">
          <Badge
            className={
              note.bookmark
                ? 'bg-red-100 text-red-800'
                : 'bg-gray-100 text-gray-800'
            }
          >
            {note.bookmark ? '已收藏' : '未收藏'}
          </Badge>
        </div>
      )
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => <DataTableColumnHeader column={column} title="狀態" />,
    cell: ({ row }) => {
      const note = row.original

      return (
        <div className="px-1">
          <Badge
            className={
              note.status
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }
          >
            {note.status ? '已發佈' : '草稿'}
          </Badge>
        </div>
      )
    },
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
    cell: ({ row }) => <NoteRowActions row={row} />,
  },
]