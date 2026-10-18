import { createFileRoute } from '@tanstack/react-router'
import { client } from '@/lib/orpc'
import { ogImageResponse } from '@/lib/og/render-og-image'
import { formatOgDate, ogAvatarUrl } from '@/lib/og/og-url'

// 文章的動態 OG 圖：/og/posts/:slug → 1200×630 PNG
export const Route = createFileRoute('/og/posts/$slug')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const res = await client.post.getPost({ id: params.slug }).catch(() => null)
        const post = res?.status === 'success' ? res.data : null
        if (!post) return new Response('Not Found', { status: 404 })

        return ogImageResponse({
          title: post.title,
          description: post.summary ?? undefined,
          eyebrow: `文章 · ${post.category.name}`,
          meta: [
            formatOgDate(post.createdAt),
            ...post.tags.slice(0, 3).map((tag) => `#${tag.name}`),
          ],
          avatarUrl: ogAvatarUrl(request),
        })
      },
    },
  },
})
