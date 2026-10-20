import { createFileRoute } from '@tanstack/react-router'
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/seo'
import { ogImageResponse } from '@/lib/og/render-og-image'
import { ogAvatarUrl } from '@/lib/og/og-url'

// 一般頁面（首頁、列表、分類、專欄…）共用的 OG 圖：/og?title=&description=
// 文字只來自本站 head() 組出的 URL；仍限制長度，避免被拿去產生任意長字串圖片。
export const Route = createFileRoute('/og/')({
  server: {
    handlers: {
      GET: ({ request }) => {
        const search = new URL(request.url).searchParams
        const title = search.get('title')?.slice(0, 80) || SITE_NAME
        const description = search.get('description')?.slice(0, 120) || SITE_DESCRIPTION

        return ogImageResponse({
          title,
          description,
          eyebrow: title === SITE_NAME ? undefined : SITE_NAME,
          avatarUrl: ogAvatarUrl(request),
        })
      },
    },
  },
})
