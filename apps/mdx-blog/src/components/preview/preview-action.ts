'use server'

import { serialize } from 'next-mdx-remote-client/serialize'
import type { SerializeOptions } from 'next-mdx-remote-client/serialize'
import type { postSchema } from '@sao-blog/api/schema/post'
import type { z } from 'zod'
import { env } from '@sao-blog/env/web'

import getMdxOptions, { getBasicMdxOptions } from '@/components/mdx/parsers'
import type { ApiResponse } from '@/types/api'
import type { NoteItem } from '@/types/note'
import type { PreviewKind, PreviewResult } from './preview-types'

// 直接打 OpenAPI REST 端點（與日記頁相同作法）。
// getPost / getNote 都是 publicProcedure，不需要任何 header / auth，
// 也因此避開了 oRPC client 在 Server Action 內轉發 next/headers 造成的
// content-length 不符問題。
type PostItem = z.infer<typeof postSchema>

async function fetchApi<T>(path: string): Promise<T | null> {
  const res = await fetch(`${env.NEXT_PUBLIC_SERVER_URL}/api${path}`, {
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
export async function getArticlePreview({
  type,
  id,
}: {
  type: PreviewKind
  id: string
}): Promise<PreviewResult> {
  try {
    if (type === 'note') {
      const note = await fetchApi<NoteItem>(`/notes/${id}`)
      if (!note) return { ok: false, message: '找不到日記' }

      const serialized = await serialize({
        source: note.content,
        options: getBasicMdxOptions(note.content) as unknown as SerializeOptions,
      })
      if ('error' in serialized) {
        return { ok: false, message: serialized.error.message }
      }

      return {
        ok: true,
        serialized,
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

    const serialized = await serialize({
      source: post.content,
      options: getMdxOptions(post.content) as unknown as SerializeOptions,
    })
    if ('error' in serialized) {
      return { ok: false, message: serialized.error.message }
    }

    return {
      ok: true,
      serialized,
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
}
