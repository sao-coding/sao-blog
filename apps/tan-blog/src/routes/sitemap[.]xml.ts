import { createFileRoute } from '@tanstack/react-router'
import { env } from '@sao-blog/env/tan-blog'
import { client } from '@/lib/orpc'
import { localizeHref, locales } from '#/paraglide/runtime'

type UrlEntry = {
  loc: string
  lastmod?: string
  changefreq?: 'daily' | 'weekly' | 'monthly'
  priority?: string
  // 三語 UI 頁互相列 hreflang；內容頁只有原文，不列
  alternates?: boolean
}

function toAbsolute(path: string) {
  return new URL(path, env.VITE_SITE_URL).toString()
}

function alternateLinks(path: string) {
  const link = (hreflang: string, href: string) =>
    `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${toAbsolute(href)}"/>\n`
  return (
    locales.map((locale) => link(locale, localizeHref(path, { locale }))).join('') +
    link('x-default', path)
  )
}

function renderUrlset(entries: UrlEntry[]) {
  const body = entries
    .map((entry) => {
      const path = new URL(entry.loc).pathname
      return `
  <url>
    <loc>${entry.loc}</loc>
${entry.alternates ? alternateLinks(path) : ''}${entry.lastmod ? `    <lastmod>${entry.lastmod}</lastmod>\n` : ''}${entry.changefreq ? `    <changefreq>${entry.changefreq}</changefreq>\n` : ''}${entry.priority ? `    <priority>${entry.priority}</priority>\n` : ''}  </url>`
    })
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${body}
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

        // 分類頁的 lastmod = 該分類最新一篇文章的更新時間
        const categoryLastmod = new Map<string, Date>()
        for (const post of posts) {
          const prev = categoryLastmod.get(post.category.slug)
          if (!prev || post.updatedAt > prev) categoryLastmod.set(post.category.slug, post.updatedAt)
        }

        const entries: UrlEntry[] = [
          { loc: toAbsolute('/'), alternates: true, changefreq: 'daily', priority: '1.0' },
          { loc: toAbsolute('/posts'), alternates: true, changefreq: 'daily', priority: '0.8' },
          { loc: toAbsolute('/notes'), alternates: true, changefreq: 'daily', priority: '0.8' },
          { loc: toAbsolute('/notes/topics'), alternates: true, changefreq: 'weekly', priority: '0.6' },
          { loc: toAbsolute('/thinking'), alternates: true, changefreq: 'daily', priority: '0.5' },
          { loc: toAbsolute('/timeline'), alternates: true, changefreq: 'weekly', priority: '0.5' },
          ...posts.map((post) => ({
            loc: toAbsolute(`/posts/${post.slug}`),
            lastmod: post.updatedAt.toISOString(),
            changefreq: 'weekly' as const,
            priority: '0.7',
          })),
          ...noteIds.map((note) => ({
            loc: toAbsolute(`/notes/${note.id}`),
            lastmod: new Date(note.updatedAt).toISOString(),
            changefreq: 'monthly' as const,
            priority: '0.6',
          })),
          ...topics.map((topic) => ({
            loc: toAbsolute(`/notes/topics/${topic.slug}`),
            lastmod: topic.updatedAt,
            changefreq: 'weekly' as const,
            priority: '0.5',
          })),
          ...[...categoryLastmod].map(([slug, updatedAt]) => ({
            loc: toAbsolute(`/categories/${slug}`),
            lastmod: updatedAt.toISOString(),
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
