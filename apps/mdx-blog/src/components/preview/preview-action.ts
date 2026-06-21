'use server'

import { serialize } from 'next-mdx-remote-client/serialize'
import type { SerializeOptions } from 'next-mdx-remote-client/serialize'

import { client } from '@/lib/orpc'
import getMdxOptions, { getBasicMdxOptions } from '@/components/mdx/parsers'
import type { PreviewKind, PreviewResult } from './preview-types'

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
      const res = await client.note.getNote({ id })
      const note = res.data
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
          createdAt: note.createdAt ? new Date(note.createdAt).toISOString() : null,
        },
      }
    }

    const res = await client.post.getPost({ id })
    const post = res.data
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
        createdAt: post.createdAt ? new Date(post.createdAt).toISOString() : null,
      },
    }
  } catch (err) {
    console.error('getArticlePreview error:', err)
    return { ok: false, message: '讀取預覽內容時發生錯誤' }
  }
}
