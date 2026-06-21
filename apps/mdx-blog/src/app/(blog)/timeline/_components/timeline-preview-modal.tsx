'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'

import { orpc } from '@/lib/orpc'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'

// ─── go-to 參數工具 ───────────────────────────────────────────────────────────
// go-to 的值即為真實文章路徑（去掉開頭斜線），例如：
//   posts/my-slug  ->  /posts/my-slug
//   notes/abc123   ->  /notes/abc123

interface ParsedGoTo {
  type: 'post' | 'note'
  id: string
  href: string
}

function parseGoTo(value: string | null): ParsedGoTo | null {
  if (!value) return null
  const [segment, ...rest] = value.split('/')
  const id = rest.join('/')
  if (!segment || !id) return null
  return {
    type: segment === 'notes' ? 'note' : 'post',
    id,
    href: `/${value}`,
  }
}

/** 在 timeline 連結 onClick 中呼叫：用 History API 淺層更新 URL 開啟預覽（不重新抓列表） */
export function openTimelinePreview(goTo: string) {
  const params = new URLSearchParams(window.location.search)
  params.set('go-to', goTo)
  window.history.pushState(null, '', `${window.location.pathname}?${params}`)
}

function removeGoToUrl() {
  const params = new URLSearchParams(window.location.search)
  params.delete('go-to')
  const qs = params.toString()
  return qs ? `${window.location.pathname}?${qs}` : window.location.pathname
}

// 從 MDX/Markdown 內容粗略取出純文字摘要
function toExcerpt(source: string, max = 140) {
  const text = source
    .replace(/^---[\s\S]*?---/, '') // frontmatter
    .replace(/```[\s\S]*?```/g, ' ') // code block
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // image
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // link
    .replace(/[#>*_`~-]/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > max ? `${text.slice(0, max)}…` : text
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TimelinePreviewModal() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const target = useMemo(
    () => parseGoTo(searchParams.get('go-to')),
    [searchParams]
  )
  const open = target !== null

  const isPost = target?.type === 'post'
  const isNote = target?.type === 'note'

  const postQuery = useQuery({
    ...orpc.post.getPost.queryOptions({ input: { id: target?.id ?? '' } }),
    enabled: open && isPost,
  })
  const noteQuery = useQuery({
    ...orpc.note.getNote.queryOptions({ input: { id: target?.id ?? '' } }),
    enabled: open && isNote,
  })

  const close = useCallback(() => {
    window.history.pushState(null, '', removeGoToUrl())
  }, [])

  const goToArticle = useCallback(() => {
    if (target) router.push(target.href)
  }, [router, target])

  const isLoading = isPost ? postQuery.isLoading : noteQuery.isLoading

  // 統一抽出顯示用資料
  const preview = useMemo(() => {
    if (isPost) {
      const post = postQuery.data?.data
      if (!post) return null
      return {
        title: post.title,
        cover: post.cover,
        excerpt: post.summary || toExcerpt(post.content),
        meta: [post.category?.name, '文章'].filter(Boolean).join(' · '),
      }
    }
    if (isNote) {
      const note = noteQuery.data?.data
      if (!note) return null
      return {
        title: note.title,
        cover: null as string | null,
        excerpt: toExcerpt(note.content),
        meta: [
          note.mood && `心情：${note.mood}`,
          note.weather && `天氣：${note.weather}`,
          '筆記',
        ]
          .filter(Boolean)
          .join(' · '),
      }
    }
    return null
  }, [isPost, isNote, postQuery.data, noteQuery.data])

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        {isLoading || !preview ? (
          <div className="space-y-3">
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ) : (
          <>
            <DialogHeader>
              {preview.cover && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview.cover}
                  alt={preview.title}
                  className="mb-1 aspect-video w-full rounded-lg object-cover"
                />
              )}
              <DialogTitle className="text-lg leading-snug">
                {preview.title}
              </DialogTitle>
              {preview.meta && (
                <p className="text-xs text-muted-foreground">{preview.meta}</p>
              )}
            </DialogHeader>
            <DialogDescription className="line-clamp-4">
              {preview.excerpt || '（沒有可預覽的內容）'}
            </DialogDescription>
          </>
        )}

        <DialogFooter>
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
