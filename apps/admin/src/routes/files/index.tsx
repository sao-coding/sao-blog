import { useState } from 'react'
import AdminShell from '@/components/layout/admin-shell'
import { FileUploadZone } from '@/components/files/file-upload-zone'
import { FileGrid } from '@/components/files/file-grid'
import { FILE_CATEGORIES, type FileCategory } from '@/lib/file-categories'
import { orpc } from '@/utils/orpc'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@sao-blog/ui/components/button'
import { Input } from '@sao-blog/ui/components/input'
import { cn } from '@sao-blog/ui/lib/utils'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

export const Route = createFileRoute('/files/')({
  component: RouteComponent,
})

const PAGE_SIZE = 24

function RouteComponent() {
  const [category, setCategory] = useState<FileCategory | undefined>(undefined)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, status, isPlaceholderData } = useQuery({
    ...orpc.admin.file.getFiles.queryOptions({
      input: { page, pageSize: PAGE_SIZE, category, search: search || undefined },
    }),
    placeholderData: (prev) => prev,
  })

  const activeCategoryConfig = category ? FILE_CATEGORIES.find((c) => c.key === category) : undefined
  const total = data?.status === 'success' ? (data.meta?.total ?? 0) : 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <AdminShell title="檔案管理">
      <div className="space-y-4">
        <FileUploadZone
          accept={activeCategoryConfig?.accept}
          onUploaded={() => setPage(1)}
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant={category === undefined ? 'secondary' : 'ghost'}
              onClick={() => {
                setCategory(undefined)
                setPage(1)
              }}
            >
              全部
            </Button>
            {FILE_CATEGORIES.map((c) => (
              <Button
                key={c.key}
                size="sm"
                variant={category === c.key ? 'secondary' : 'ghost'}
                onClick={() => {
                  setCategory(c.key)
                  setPage(1)
                }}
                className="gap-1.5"
              >
                <c.icon className="size-3.5" />
                {c.label}
              </Button>
            ))}
          </div>

          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="搜尋檔名..."
            className="w-full sm:w-56"
          />
        </div>

        <FileGrid
          files={data?.status === 'success' ? data.data : []}
          isLoading={status === 'pending'}
        />

        {total > PAGE_SIZE && (
          <div className="flex items-center justify-center gap-2">
            <Button
              size="icon-sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeftIcon className="size-4" />
            </Button>
            <span className={cn('text-sm text-muted-foreground', isPlaceholderData && 'opacity-50')}>
              第 {page} / {totalPages} 頁
            </span>
            <Button
              size="icon-sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </AdminShell>
  )
}
