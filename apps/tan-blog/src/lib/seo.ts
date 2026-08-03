import { env } from '@sao-blog/env/tan-blog'
import { deLocalizeHref, locales, localizeHref } from '#/paraglide/runtime'

export const SITE_NAME = '唯一のBlog'
export const SITE_DESCRIPTION = '這雖然是遊戲，但可不是鬧著玩的'
export const SITE_LOCALE = 'zh_TW'
// 目前尚無專用的預設 OG 圖，暫用現有大頭貼；之後若有設計資源
// 再換成 public/og.png（TDD 8.1 列為 ⭐ 選配）。
export const DEFAULT_OG_IMAGE = '/img/avatar.jpg'

export function absoluteUrl(path: string): string {
  return new URL(path, env.VITE_SITE_URL).toString()
}

type OpenGraphType = 'website' | 'article' | 'profile'

export interface PageSeoInput {
  title: string
  description?: string
  path: string
  type?: OpenGraphType
  image?: string
  publishedTime?: string
  modifiedTime?: string
  tags?: string[]
  noindex?: boolean
  // UI chrome 頁（首頁/列表/登入等）三語都有獨立文案，加上 hreflang alternates；
  // 文章/日記內容頁只有 zh-Hant 內容，三語 URL 顯示相同內容，故不產生 alternates，
  // canonical 一律指回未帶 locale 前綴的原文版本（見 TDD 第八部分）。
  alternates?: boolean
}

// 供文章/日記等「內容不翻譯」頁面使用：canonical 一律指回無 locale 前綴的版本。
export function contentCanonicalUrl(path: string): string {
  return absoluteUrl(deLocalizeHref(path))
}

function localeAlternateLinks(path: string) {
  const base = deLocalizeHref(path)
  const links = locales.map((locale) => ({
    rel: 'alternate' as const,
    hrefLang: locale === 'zh-Hant' ? 'zh-Hant' : locale,
    href: absoluteUrl(localizeHref(base, { locale })),
  }))
  links.push({
    rel: 'alternate' as const,
    hrefLang: 'x-default',
    href: absoluteUrl(base),
  })
  return links
}

export function pageHead({
  title,
  description = SITE_DESCRIPTION,
  path,
  type = 'website',
  image = DEFAULT_OG_IMAGE,
  publishedTime,
  modifiedTime,
  tags,
  noindex,
  alternates = true,
}: PageSeoInput) {
  const url = alternates ? absoluteUrl(path) : contentCanonicalUrl(path)
  const imageUrl = absoluteUrl(image)

  const meta = [
    { title },
    { name: 'description', content: description },
    { property: 'og:site_name', content: SITE_NAME },
    { property: 'og:type', content: type },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: url },
    { property: 'og:image', content: imageUrl },
    { property: 'og:locale', content: SITE_LOCALE },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: imageUrl },
  ]

  if (type === 'article' && publishedTime) {
    meta.push({ property: 'article:published_time', content: publishedTime })
  }
  if (type === 'article' && modifiedTime) {
    meta.push({ property: 'article:modified_time', content: modifiedTime })
  }
  if (type === 'article' && tags) {
    for (const tag of tags) {
      meta.push({ property: 'article:tag', content: tag })
    }
  }
  if (noindex) {
    meta.push({ name: 'robots', content: 'noindex, nofollow' })
  }

  return {
    meta,
    links: [
      { rel: 'canonical', href: url },
      ...(alternates ? localeAlternateLinks(path) : []),
    ],
  }
}

// TanStack Start 的 head() 用 `scripts` 陣列輸出 <script>，會經 <HeadContent />
// 統一渲染進 <head>，比在 body 內用 React 元件渲染 <script type="application/ld+json">
// 更符合框架的 SSR/去重機制，故以此輔助函式取代獨立的 <JsonLd> 元件。
export function jsonLdScript(data: Record<string, unknown>) {
  return { type: 'application/ld+json', children: JSON.stringify(data) }
}

export function blogPostingJsonLd({
  title,
  description,
  path,
  image = DEFAULT_OG_IMAGE,
  authorName,
  publishedTime,
  modifiedTime,
  tags,
}: {
  title: string
  description?: string
  path: string
  image?: string
  authorName?: string
  publishedTime: string
  modifiedTime?: string
  tags?: string[]
}) {
  return jsonLdScript({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description,
    image: absoluteUrl(image),
    url: absoluteUrl(path),
    datePublished: publishedTime,
    dateModified: modifiedTime ?? publishedTime,
    keywords: tags?.join(', '),
    author: authorName ? { '@type': 'Person', name: authorName } : undefined,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
    },
  })
}

export function websiteJsonLd() {
  return jsonLdScript({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: absoluteUrl('/'),
    potentialAction: {
      '@type': 'SearchAction',
      target: `${absoluteUrl('/posts')}?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  })
}
