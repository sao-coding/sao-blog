'use client'

import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { NoteItem } from '@/types/note'
import { ColumnDef } from '@tanstack/react-table'
import dayjs from 'dayjs'
import { DataTableColumnHeader } from '../../../../_components/table/table-column-header'
import Link from 'next/link'
import { RowActions } from './row-actions'

const moodMap: Record<string, { label: string; color: string }> = {
  happy: { label: '開心', color: 'bg-green-100 text-green-800' },
  sad: { label: '難過', color: 'bg-blue-100 text-blue-800' },
  angry: { label: '生氣', color: 'bg-red-100 text-red-800' },
  excited: { label: '興奮', color: 'bg-yellow-100 text-yellow-800' },
  calm: { label: '平靜', color: 'bg-gray-100 text-gray-800' },
  anxious: { label: '焦慮', color: 'bg-purple-100 text-purple-800' },
}

const weatherMap: Record<string, { label: string; color: string }> = {
  sunny: { label: '晴天', color: 'bg-yellow-100 text-yellow-800' },
  cloudy: { label: '多雲', color: 'bg-gray-100 text-gray-800' },
  rainy: { label: '下雨', color: 'bg-blue-100 text-blue-800' },
  snowy: { label: '下雪', color: 'bg-cyan-100 text-cyan-800' },
  windy: { label: '有風', color: 'bg-green-100 text-green-800' },
  stormy: { label: '暴風雨', color: 'bg-red-100 text-red-800' },
}

export const columns: ColumnDef<NoteItem>[] = [
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
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="標題" />
    ),
    cell: ({ row }) => {
      const note = row.original
      return (
        <Link
          href={`/admin/notes/editor/${note.id}`}
          className="hover:underline flex items-center"
        >
          <span className="ml-2 w-40 truncate">{note.title}</span>
        </Link>
      )
    },
  },
  {
    accessorKey: 'mood',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="心情" />
    ),
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
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="天氣" />
    ),
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
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="收藏" />
    ),
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
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="狀態" />
    ),
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
            {note.status ? '啟用' : '停用'}
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
    cell: ({ row }) => <RowActions row={row} />,
  },
]
