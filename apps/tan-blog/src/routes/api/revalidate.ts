import { createFileRoute } from '@tanstack/react-router'
import { env } from '@sao-blog/env/tan-blog'
import { invalidateCachedPost } from '@/lib/isr/post'
import { invalidateCachedNote } from '@/lib/isr/note'
import { invalidateCachedTopic } from '@/lib/isr/topic'

// apps/server 的 notifyBlogRevalidate() 在文章/筆記/專欄 建立、更新、刪除後
// 會打這支端點，帶上受影響的路徑清單，讓對應的 ISR 快取立即失效——不用等
// maxAge 到期，也不依賴任何外部 CDN 或反代 purge API。
const POST_RE = /^\/posts\/([^/]+)\/?$/
const TOPIC_RE = /^\/notes\/topics\/([^/]+)\/?$/
const NOTE_RE = /^\/notes\/([^/]+)\/?$/

async function invalidatePath(path: string) {
  const postMatch = POST_RE.exec(path)
  if (postMatch) return invalidateCachedPost(decodeURIComponent(postMatch[1]))

  const topicMatch = TOPIC_RE.exec(path)
  if (topicMatch) return invalidateCachedTopic(decodeURIComponent(topicMatch[1]))

  const noteMatch = NOTE_RE.exec(path)
  if (noteMatch) return invalidateCachedNote(decodeURIComponent(noteMatch[1]))

  // 其餘路徑（/、/posts、/notes、/notes/topics 等列表頁）是純 SSR，沒有這層
  // 快取可清，忽略即可。
}

export const Route = createFileRoute('/api/revalidate')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = request.headers.get('x-revalidate-secret')
        if (!secret || secret !== env.REVALIDATE_SECRET) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        let body: unknown
        try {
          body = await request.json()
        } catch {
          return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
        }

        const paths = (body as { paths?: unknown })?.paths
        if (!Array.isArray(paths) || !paths.every((p) => typeof p === 'string')) {
          return Response.json({ error: 'paths must be a string[]' }, { status: 400 })
        }

        await Promise.all(paths.map(invalidatePath))

        return Response.json({ revalidated: true, paths })
      },
    },
  },
})
