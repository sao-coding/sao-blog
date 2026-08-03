import { createFileRoute } from '@tanstack/react-router'
import { env } from '@sao-blog/env/tan-blog'

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: () => {
        const body = `User-agent: *
Allow: /
Disallow: /login

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
