'use client'

import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type RowData,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from '@tanstack/react-table'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@sao-blog/ui/components/table'
import { DataTablePagination } from './table-pagination'
import { Input } from '@sao-blog/ui/components/input'
import { DataTableViewOptions } from './table-view-options'
import { useState, type ReactNode } from 'react'
import { Button } from '@sao-blog/ui/components/button'
import { Skeleton } from '@sao-blog/ui/components/skeleton'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@sao-blog/ui/components/empty'
import { InboxIcon, SearchIcon, Trash2, XIcon } from 'lucide-react'

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    className: string
  }
}

// 搜尋框 placeholder 用的欄位名稱（searchColumnId 是資料欄位 id，不適合直接給人看）
const SEARCH_LABELS: Record<string, string> = {
  title: '標題',
  name: '名稱',
  content: '內容',
  displayUsername: '留言者',
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  searchColumnId: string
  data: TData[]
  onBatchDelete?: (selectedRows: TData[]) => void
  /** 載入中：表格顯示骨架列 */
  isLoading?: boolean
  searchPlaceholder?: string
  /** 完全沒有資料（不是搜尋不到）時的說明 */
  emptyDescription?: string
  /** 勾選列之後顯示的批次操作；clear 用來在操作完成後取消勾選 */
  renderBatchActions?: (rows: TData[], clear: () => void) => ReactNode
}

export function DataTableContainer<TData, TValue>({
  columns,
  searchColumnId,
  data,
  onBatchDelete,
  isLoading = false,
  searchPlaceholder,
  emptyDescription,
  renderBatchActions,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  const [rowSelection, setRowSelection] = useState({})

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  const searchColumn = table.getColumn(searchColumnId)
  const searchValue = (searchColumn?.getFilterValue() as string) ?? ''
  const selectedCount = table.getFilteredSelectedRowModel().rows.length

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 pb-3">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder ?? `搜尋${SEARCH_LABELS[searchColumnId] ?? ''}…`}
            value={searchValue}
            onChange={(event) => searchColumn?.setFilterValue(event.target.value)}
            className="pr-8 pl-8"
          />
          {searchValue && (
            <button
              type="button"
              aria-label="清除搜尋"
              onClick={() => searchColumn?.setFilterValue('')}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
            >
              <XIcon className="size-3.5" />
            </button>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {selectedCount > 0 &&
            renderBatchActions?.(
              table.getFilteredSelectedRowModel().rows.map((row) => row.original),
              () => table.resetRowSelection()
            )}
          {selectedCount > 0 && onBatchDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onBatchDelete(table.getFilteredSelectedRowModel().rows.map((row) => row.original))}
            >
              <Trash2 />
              刪除 {selectedCount} 筆
            </Button>
          )}
          <DataTableViewOptions table={table} />
        </div>
      </div>

      {/* 窄螢幕時表格可以橫向捲動（原本 overflow-hidden 會把右邊的欄位切掉） */}
      <div className="overflow-x-auto rounded-xl border bg-card/60 shadow-sm">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="group/row bg-muted/30 hover:bg-muted/30">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    className={header.column.columnDef.meta?.className ?? ''}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }, (_, i) => (
                <TableRow key={i} className="hover:bg-transparent">
                  {table.getVisibleLeafColumns().map((col) => (
                    <TableCell key={col.id}>
                      <Skeleton className="h-4 w-full max-w-40" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className="group/row"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cell.column.columnDef.meta?.className ?? ''}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="p-0">
                  <Empty className="border-0 py-10">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">{searchValue ? <SearchIcon /> : <InboxIcon />}</EmptyMedia>
                      <EmptyTitle>{searchValue ? `找不到「${searchValue}」` : '還沒有資料'}</EmptyTitle>
                      <EmptyDescription>
                        {searchValue ? '換個關鍵字試試看。' : (emptyDescription ?? '新增後會出現在這裡。')}
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {!isLoading && table.getPageCount() > 0 && (
        <div className="pt-3">
          <DataTablePagination table={table} />
        </div>
      )}
    </div>
  )
}
