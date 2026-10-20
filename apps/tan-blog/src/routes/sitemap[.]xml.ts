import { createFileRoute } from '@tanstack/react-router'
import { env } from '@sao-blog/env/tan-blog'
import { client } from '@/lib/orpc'

type UrlEntry = {
  loc: string
  lastmod?: string
  changefreq?: 'daily' | 'weekly' | 'monthly'
  priority?: string
}

function toAbsolute(path: string) {
  return new URL(path, env.VITE_SITE_URL).toString()
}

function renderUrlset(entries: UrlEntry[]) {
  const body = entries
    .map(
      (entry) => `
  <url>
    <loc>${entry.loc}</loc>
${entry.lastmod ? `    <lastmod>${entry.lastmod}</lastmod>\n` : ''}${entry.changefreq ? `    <changefreq>${entry.changefreq}</changefreq>\n` : ''}${entry.priority ? `    <priority>${entry.priority}</priority>\n` : ''}  </url>`
    )
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}
</urlset>`
}

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        const [postsRes, noteIdsRes, topicsRes] = await Promise.all([
          client.post.getPosts({}),
          client.note.getNoteIds(),
          client.topic.getTopics(),
        ])

        const posts = postsRes.status === 'success' ? postsRes.data : []
        const noteIds = noteIdsRes.status === 'success' ? noteIdsRes.data : []
        const topics = topicsRes.status === 'success' ? topicsRes.data : []

        const categorySlugs = Array.from(
          new Set(posts.map((post) => post.category.slug))
        )

        const entries: UrlEntry[] = [
          { loc: toAbsolute('/'), changefreq: 'daily', priority: '1.0' },
          { loc: toAbsolute('/posts'), changefreq: 'daily', priority: '0.8' },
          { loc: toAbsolute('/notes'), changefreq: 'daily', priority: '0.8' },
          { loc: toAbsolute('/notes/topics'), changefreq: 'weekly', priority: '0.6' },
          { loc: toAbsolute('/thinking'), changefreq: 'daily', priority: '0.5' },
          { loc: toAbsolute('/timeline'), changefreq: 'weekly', priority: '0.5' },
          ...posts.map((post) => ({
            loc: toAbsolute(`/posts/${post.slug}`),
            lastmod: post.updatedAt.toISOString(),
            changefreq: 'weekly' as const,
            priority: '0.7',
          })),
          ...noteIds.map((note) => ({
            loc: toAbsolute(`/notes/${note.id}`),
            changefreq: 'monthly' as const,
            priority: '0.6',
          })),
          ...topics.map((topic) => ({
            loc: toAbsolute(`/notes/topics/${topic.slug}`),
            lastmod: topic.updatedAt,
            changefreq: 'weekly' as const,
            priority: '0.5',
          })),
          ...categorySlugs.map((slug) => ({
            loc: toAbsolute(`/categories/${slug}`),
            changefreq: 'weekly' as const,
            priority: '0.5',
          })),
        ]

        return new Response(renderUrlset(entries), {
          headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
          },
        })
      },
    },
  },
})
