import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import { defineCachedFunction } from 'nitro/cache'
import { z } from 'zod'
import { client } from '@/lib/orpc'
import { reviveDates } from './revive-dates'
import { CONTENT_LOCALES, type ContentLocale } from '@/lib/content-locale'
import { localeSchema } from '@sao-blog/api/schema/i18n'

async function fetchTopicImpl(slug: string, locale: ContentLocale) {
  const res = await client.topic.getTopicBySlug({ slug, locale })
  if (!res || res.status === 'error' || !res.data) return null
  return res.data
}

type CachedTopicFn = typeof fetchTopicImpl & {
  invalidate: (slug: string, locale: ContentLocale) => Promise<void>
}

// createServerOnlyFn：避免 client bundle 載入 nitro/cache（見 post.ts）
let cachedTopic: CachedTopicFn | undefined
const getFetchTopic = createServerOnlyFn(() => {
  cachedTopic ??= defineCachedFunction(fetchTopicImpl, {
    name: 'topic',
    getKey: (slug: string, locale: ContentLocale) => `${locale}:${slug}`,
    maxAge: 60 * 60,
    swr: true,
  }) as CachedTopicFn
  return cachedTopic
})

export const getCachedTopic = createServerFn({ method: 'GET' })
  .validator(z.object({ slug: z.string(), locale: localeSchema }))
  .handler(async ({ data: { slug, locale } }) => {
    const result = await getFetchTopic()(slug, locale)
    return result ? reviveDates(result) : null
  })

export async function invalidateCachedTopic(slug: string) {
  await Promise.all(CONTENT_LOCALES.map((locale) => getFetchTopic().invalidate(slug, locale)))
}
