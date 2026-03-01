'use client'

import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { PostItem } from '@/types/post'
import { ColumnDef } from '@tanstack/react-table'
import dayjs from 'dayjs'
import { DataTableColumnHeader } from '../../../../_components/table/table-column-header'
import Link from 'next/link'
import { PostRowActions } from './post-row-actions'
// export interface PostListItem {
//   id: string;
//   title: string;
//   slug: string;
//   status: "draft" | "published" | "archived";
//   author: {
//     id: string;
//     name: string;
//   };
//   views: number;
//   comments: number;
//   publishedAt: string | null;
//   createdAt: string;
//   updatedAt: string;
// }

const postStatusMap: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'bg-gray-200 text-gray-800' },
  published: { label: '已發佈', color: 'bg-green-100 text-green-800' },
  archived: { label: '已歸檔', color: 'bg-yellow-100 text-yellow-800' },
}

export const columns: ColumnDef<PostItem>[] = [
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
    // header: "標題",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="標題" />
    ),
    cell: ({ row }) => {
      const post = row.original
      return (
        <Link
          href={`/admin/posts/editor/${post.id}`}
          className="hover:underline flex items-center"
        >
          <span className="ml-2 w-40 truncate">{post.title}</span>
        </Link>
      )
    },
  },
  {
    accessorKey: 'author',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="作者" />
    ),
    cell: ({ row }) => {
      const post = row.original
      return <span className="ml-2">{post.author.name}</span>
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="狀態" />
    ),
    cell: ({ row }) => {
      const post = row.original
      return (
        <div className="px-1">
          <Badge className={postStatusMap[post.status]?.color}>
            {postStatusMap[post.status]?.label ?? '-'}
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
    cell: ({ row }) => <PostRowActions row={row} />,
  },
]
