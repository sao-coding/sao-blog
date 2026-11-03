import { createFileRoute } from '@tanstack/react-router'
import { env } from '@sao-blog/env/tan-blog'

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: () => {
        // /og 動態圖要讓社群爬蟲與 Googlebot 抓得到，所以不擋；
        // 後台、API、登入、編輯器預覽沒有索引價值。
        const body = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Disallow: /login
Disallow: /editor-preview

Sitemap: ${new URL('/sitemap.xml', env.VITE_SITE_URL).toString()}
`
        return new Response(body, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=3600',
          },
        })
      },
    },
  },
})
