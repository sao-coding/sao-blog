import { createFileRoute } from '@tanstack/react-router'
import { client } from '@/lib/orpc'
import { mdxToPlainText } from '@/lib/plain-text'
import { ogImageResponse } from '@/lib/og/render-og-image'
import { formatOgDate, ogAvatarUrl } from '@/lib/og/og-url'

// 日記的動態 OG 圖：/og/notes/:id → 1200×630 PNG
export const Route = createFileRoute('/og/notes/$id')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const res = await client.note.getNote({ id: params.id }).catch(() => null)
        const note = res?.status === 'success' ? res.data : null
        if (!note) return new Response('Not Found', { status: 404 })

        return ogImageResponse({
          title: note.title,
          description: mdxToPlainText(note.content, 90),
          eyebrow: '日記',
          meta: [formatOgDate(note.createdAt), note.mood, note.weather].filter(Boolean),
          avatarUrl: ogAvatarUrl(request),
        })
      },
    },
  },
})
