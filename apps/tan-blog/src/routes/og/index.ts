import { createFileRoute } from '@tanstack/react-router'
import { siteDescription, siteName } from '@/lib/seo'
import { ogImageResponse } from '@/lib/og/render-og-image'
import { ogAvatarUrl } from '@/lib/og/og-url'

// 一般頁面（首頁、列表、分類、專欄…）共用的 OG 圖：/og?title=&description=
// 文字只來自本站 head() 組出的 URL；仍限制長度，避免被拿去產生任意長字串圖片。
export const Route = createFileRoute('/og/')({
  server: {
    handlers: {
      GET: ({ request }) => {
        const search = new URL(request.url).searchParams
        const title = search.get('title')?.slice(0, 80) || siteName()
        const description = search.get('description')?.slice(0, 120) || siteDescription()

        return ogImageResponse({
          title,
          description,
          eyebrow: undefined,
          avatarUrl: ogAvatarUrl(request),
        })
      },
    },
  },
})
