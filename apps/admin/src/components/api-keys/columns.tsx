'use client'

import { type ColumnDef } from '@tanstack/react-table'
import type { ApiKey } from '@/types/api-key'
import { RowActions } from './row-actions'

const formatDate = (iso?: string | null) => {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export const columns: ColumnDef<ApiKey, unknown>[] = [
  {
    accessorKey: 'name',
    header: '名稱',
    cell: ({ getValue }) => (
      <div className="font-medium">{(getValue() as string) ?? '未命名'}</div>
    ),
    meta: { className: 'max-w-sm' },
  },
  {
    accessorKey: 'prefix',
    header: '前綴',
    cell: ({ getValue }) => <div>{(getValue() as string) ?? '—'}</div>,
    meta: { className: 'text-sm' },
  },
  {
    accessorKey: 'referenceId',
    header: 'Reference ID',
    cell: ({ getValue }) => (
      <div className="text-xs text-muted-foreground">
        {getValue() as string}
      </div>
    ),
    meta: { className: 'text-xs' },
  },
  {
    id: 'rateLimit',
    header: '速率限制',
    cell: ({ row }) => {
      const r = row.original as ApiKey
      if (!r?.rateLimitEnabled) return <div>—</div>
      const max = r.rateLimitMax ?? '—'
      const window = r.rateLimitTimeWindow
        ? `${r.rateLimitTimeWindow / 1000 / 60 / 60}h`
        : '—'
      return <div>{`${max} / ${window}`}</div>
    },
    meta: { className: 'text-sm' },
  },
  {
    id: 'requests',
    header: '請求次數',
    cell: ({ row }) => {
      const r = row.original as ApiKey
      return (
        <div>
          {r?.requestCount ?? 0} / {r?.remaining ?? '—'}
        </div>
      )
    },
    meta: { className: 'text-sm' },
  },
  {
    accessorKey: 'expiresAt',
    header: '到期',
    cell: ({ getValue }) => <div>{formatDate(getValue() as string)}</div>,
    meta: { className: 'text-sm' },
  },
  {
    accessorKey: 'createdAt',
    header: '建立時間',
    cell: ({ getValue }) => <div>{formatDate(getValue() as string)}</div>,
    meta: { className: 'text-sm' },
  },
  {
    id: 'actions',
    header: '操作',
    cell: ({ row }) => <RowActions row={row} />,
    meta: { className: 'w-32' },
  },
]

export default columns
