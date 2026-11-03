'use client'

import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CopyIcon, FileIcon, TrashIcon } from 'lucide-react'
import type { InferClientOutputs } from '@orpc/client'
import type { client } from '@/utils/orpc'
import { orpc, queryClient } from '@/utils/orpc'
import { useOverlay } from '@/hooks/use-overlay'
import { getFileCategoryConfig } from '@/lib/file-categories'
import { Card } from '@sao-blog/ui/components/card'
import { Button } from '@sao-blog/ui/components/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@sao-blog/ui/components/empty'

type RouterOutputs = InferClientOutputs<typeof client>
type FileItem = RouterOutputs['admin']['file']['getFiles']['data'][number]

interface FileGridProps {
  files: FileItem[]
  isLoading: boolean
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function FileGrid({ files, isLoading }: FileGridProps) {
  const { openAlertDialog } = useOverlay()
  const deleteMutation = useMutation(orpc.admin.file.deleteFile.mutationOptions())

  const handleCopyUrl = (file: FileItem) => {
    navigator.clipboard.writeText(file.url)
    toast.success('已複製網址')
  }

  const handleCopyMarkdown = (file: FileItem) => {
    navigator.clipboard.writeText(`![${file.filename}](${file.url})`)
    toast.success('已複製 Markdown 圖片連結')
  }

  const handleDelete = (file: FileItem) => {
    openAlertDialog({
      id: `delete-file-${file.id}`,
      render: ({ isPending }) => ({
        title: `確定刪除「${file.filename}」嗎？`,
        description: '此操作無法復原，儲存空間內的檔案也會一併刪除。',
        cancelLabel: '取消',
        confirmLabel: isPending ? '刪除中...' : '確定刪除',
        confirmVariant: 'destructive',
      }),
      onConfirm: async ({ close }) => {
        const result = await deleteMutation.mutateAsync({ id: file.id }).catch(() => null)
        if (!result || result.status === 'error') {
          toast.error(result?.message ?? '刪除檔案時發生錯誤，請稍後再試。')
          return
        }
        await queryClient.invalidateQueries({
          queryKey: orpc.admin.file.getFiles.queryOptions({ input: {} }).queryKey,
        })
        toast.success('已刪除檔案')
        close()
      },
    })
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="text-muted-foreground">載入中...</span>
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileIcon />
          </EmptyMedia>
          <EmptyTitle>沒有檔案</EmptyTitle>
          <EmptyDescription>上傳檔案後會顯示在這裡。</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {files.map((file) => {
        const categoryConfig = getFileCategoryConfig(file.category)
        const CategoryIcon = categoryConfig.icon

        return (
          <Card key={file.id} className="group/file-card overflow-hidden p-0">
            <div className="relative flex aspect-square items-center justify-center bg-muted">
              {categoryConfig.preview === 'thumbnail' ? (
                <img
                  src={file.url}
                  alt={file.filename}
                  loading="lazy"
                  className="size-full object-cover"
                />
              ) : (
                <CategoryIcon className="size-10 text-muted-foreground" />
              )}
              <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/50 opacity-0 transition-opacity group-hover/file-card:opacity-100">
                <Button
                  size="icon"
                  variant="secondary"
                  className="size-8"
                  onClick={() => handleCopyMarkdown(file)}
                  title="複製 Markdown"
                >
                  <CopyIcon className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  className="size-8"
                  onClick={() => handleDelete(file)}
                  title="刪除"
                >
                  <TrashIcon className="size-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-0.5 px-3 pb-3">
              <div className="truncate text-sm font-medium" title={file.filename}>
                {file.filename}
              </div>
              <button
                type="button"
                className="block truncate text-left text-xs text-muted-foreground hover:text-foreground hover:underline"
                onClick={() => handleCopyUrl(file)}
                title="點擊複製網址"
              >
                {formatSize(file.size)}
              </button>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
