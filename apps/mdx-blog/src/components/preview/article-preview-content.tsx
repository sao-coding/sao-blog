'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { MDXClient } from 'next-mdx-remote-client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'

import { ErrorComponent } from '@/components/index'
import { components } from '@/components/mdx/mdx-renderer'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { getArticlePreview } from './preview-action'
import { parseGoTo, removeGoToUrl } from './preview-url'

/**
 * 預覽彈窗的實際內容（較重：包含 MDXClient 與所有 MDX 區塊元件）。
 * 透過 article-preview-modal.tsx 以 next/dynamic 懶載入，
 * 第一次開啟預覽時才會載入這支檔案的程式碼。
 */
export function ArticlePreviewModalContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const target = useMemo(
    () => parseGoTo(searchParams.get('go-to')),
    [searchParams]
  )
  const open = target !== null

  const query = useQuery({
    queryKey: ['article-preview', target?.type, target?.id],
    queryFn: () => getArticlePreview({ type: target!.type, id: target!.id }),
    enabled: open,
    staleTime: 5 * 60 * 1000,
    // 關閉時 target 變 null、queryKey 會跟著換掉，
    // 沒有這個會讓 data 瞬間變 undefined，在關閉動畫播完前先閃一下錯誤畫面。
    placeholderData: keepPreviousData,
  })

  const close = useCallback(() => {
    window.history.pushState(null, '', removeGoToUrl())
  }, [])

  const goToArticle = useCallback(() => {
    if (target) router.push(target.href)
  }, [router, target])

  const result = query.data
  const meta = result?.ok ? result.meta : null

  const dateLabel = meta?.createdAt
    ? format(new Date(meta.createdAt), 'yyyy-MM-dd')
    : null
  const metaLine = meta
    ? [
        meta.category,
        meta.mood && `心情：${meta.mood}`,
        meta.weather && `天氣：${meta.weather}`,
        dateLabel,
        meta.kindLabel,
      ]
        .filter(Boolean)
        .join(' · ')
    : null

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent
        className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-2xl"
        showCloseButton={false}
      >
        {/* 標題區 */}
        <DialogHeader className="shrink-0 gap-2 border-b p-4">
          <DialogTitle className="pr-8 text-lg leading-snug">
            {meta?.title ?? <Skeleton className="h-6 w-2/3" />}
          </DialogTitle>
          {metaLine && (
            <p className="text-xs text-muted-foreground">{metaLine}</p>
          )}
        </DialogHeader>

        {/* 內容區（可捲動） */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {query.isLoading ? (
            <div className="space-y-3">
              {meta?.cover && (
                <Skeleton className="aspect-video w-full rounded-lg" />
              )}
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-10/12" />
            </div>
          ) : !result?.ok ? (
            <ErrorComponent error={result?.message ?? '無法載入預覽'} />
          ) : 'error' in result.serialized ? (
            <ErrorComponent error={result.serialized.error.message} />
          ) : (
            <>
              {meta?.cover && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={meta.cover}
                  alt={meta.title}
                  className="mb-4 aspect-video w-full rounded-lg object-cover"
                />
              )}
              <article className="prose dark:prose-invert max-w-full">
                <MDXClient
                  {...result.serialized}
                  components={components}
                  onError={({ error }) => (
                    <ErrorComponent error={error.message} />
                  )}
                />
              </article>
            </>
          )}
        </div>

        {/* 底部按鈕 */}
        <DialogFooter className="mx-0 mb-0 shrink-0">
          <Button variant="outline" onClick={close}>
            關閉
          </Button>
          <Button onClick={goToArticle} disabled={!target}>
            前往文章
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
