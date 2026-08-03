import { createServerFn } from '@tanstack/react-start'
import type { postSchema } from '@sao-blog/api/schema/post'
import { z } from 'zod'
import { env } from '@sao-blog/env/tan-blog'

import { compileMdxSource } from '@/lib/mdx/compile-source'
import type { ApiResponse } from '@/types/api'
import type { NoteItem } from '@/types/note'
import type { PreviewKind, PreviewResult } from './preview-types'

// 直接打 OpenAPI REST 端點（與日記頁相同作法）。
// getPost / getNote 都是 publicProcedure，不需要任何 header / auth，
// 也因此避開了 oRPC client 在 Server Action 內轉發 next/headers 造成的
// content-length 不符問題。
type PostItem = z.infer<typeof postSchema>

async function fetchApi<T>(path: string): Promise<T | null> {
  const res = await fetch(`${env.VITE_SERVER_URL}/api${path}`, {
    cache: 'no-store',
  })
  if (!res.ok) return null
  const json = (await res.json()) as ApiResponse<T>
  return json.data ?? null
}

/**
 * 在伺服器端把文章／日記的 MDX 內容編譯成可在 client 端 <MDXClient> 渲染的格式。
 * 與正式頁面共用同一組 remark/rehype 設定，確保預覽 = 渲染後的版本。
 */
export const getArticlePreview = createServerFn({ method: 'GET' })
  .validator(z.object({ type: z.enum(['post', 'note']), id: z.string() }))
  .handler(async ({ data }): Promise<PreviewResult> => {
    const { type, id } = data as { type: PreviewKind; id: string }
    try {
    if (type === 'note') {
      const note = await fetchApi<NoteItem>(`/notes/${id}`)
      if (!note) return { ok: false, message: '找不到日記' }

      const compiled = await compileMdxSource(note.content, 'basic')

      return {
        ok: true,
        serialized: { compiledSource: compiled.compiledSource },
        meta: {
          title: note.title,
          href: `/notes/${id}`,
          kindLabel: '筆記',
          cover: null,
          category: null,
          mood: note.mood ?? null,
          weather: note.weather ?? null,
          createdAt: note.createdAt
            ? new Date(note.createdAt).toISOString()
            : null,
        },
      }
    }

    const post = await fetchApi<PostItem>(`/posts/${id}`)
    if (!post) return { ok: false, message: '找不到文章' }

    const compiled = await compileMdxSource(post.content, 'full')

    return {
      ok: true,
      serialized: { compiledSource: compiled.compiledSource },
      meta: {
        title: post.title,
        href: `/posts/${id}`,
        kindLabel: '文章',
        cover: post.cover ?? null,
        category: post.category?.name ?? null,
        mood: null,
        weather: null,
        createdAt: post.createdAt
          ? new Date(post.createdAt).toISOString()
          : null,
      },
    }
    } catch (err) {
      console.error('getArticlePreview error:', err)
      return { ok: false, message: '讀取預覽內容時發生錯誤' }
    }
  })
