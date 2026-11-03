import { createFileRoute } from '@tanstack/react-router'
import { env } from '@sao-blog/env/tan-blog'
import { client } from '@/lib/orpc'
import { siteDescription, siteName } from '@/lib/seo'
import { postOgImagePath } from '@/lib/og/og-url'

const RSS_ITEM_LIMIT = 20

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function toAbsolute(path: string) {
  return new URL(path, env.VITE_SITE_URL).toString()
}

export const Route = createFileRoute('/rss.xml')({
  server: {
    handlers: {
      GET: async () => {
        const res = await client.post.getPosts({})
        const posts = res.status === 'success' ? res.data : []
        const items = posts
          .slice()
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, RSS_ITEM_LIMIT)

        const siteUrl = toAbsolute('/')

        const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteName())}</title>
    <link>${siteUrl}</link>
    <description>${escapeXml(siteDescription())}</description>
    <language>zh-TW</language>
    <lastBuildDate>${(items[0]?.updatedAt ?? new Date()).toUTCString()}</lastBuildDate>
    <generator>sao-blog (TanStack Start)</generator>
    <atom:link href="${toAbsolute('/rss.xml')}" rel="self" type="application/rss+xml" />
    ${items
      .map((post) => {
        const url = toAbsolute(`/posts/${post.slug}`)
        return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${post.createdAt.toUTCString()}</pubDate>
      <description>${escapeXml(post.summary ?? '')}</description>
      <category>${escapeXml(post.category.name)}</category>
${post.tags.map((tag) => `      <category>${escapeXml(tag.name)}</category>
`).join('')}      <enclosure url="${toAbsolute(postOgImagePath(post.slug))}" type="image/png" length="0" />
    </item>`
      })
      .join('')}
  </channel>
</rss>`

        return new Response(body, {
          headers: {
            'Content-Type': 'application/rss+xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
          },
        })
      },
    },
  },
})
