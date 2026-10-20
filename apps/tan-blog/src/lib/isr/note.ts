import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import { defineCachedFunction } from 'nitro/cache'
import { z } from 'zod'
import { client } from '@/lib/orpc'
import { resolveCompiled } from '@/lib/mdx/compile-source'
import { CONTENT_LOCALES, type ContentLocale } from '@/lib/content-locale'
import { localeSchema } from '@sao-blog/api/schema/i18n'
import { reviveDates } from './revive-dates'

async function fetchAndCompileNoteImpl(id: string, locale: ContentLocale) {
  const res = await client.note.getNote({ id, locale })
  if (!res.data) return null
  const mdx = await resolveCompiled(res.data, 'basic')
  return { ...res.data, ...mdx }
}

type CachedNoteFn = typeof fetchAndCompileNoteImpl & {
  invalidate: (id: string, locale: ContentLocale) => Promise<void>
}

// createServerOnlyFn：避免 client bundle 載入 nitro/cache（見 post.ts）
let cachedNote: CachedNoteFn | undefined
const getFetchAndCompileNote = createServerOnlyFn(() => {
  cachedNote ??= defineCachedFunction(fetchAndCompileNoteImpl, {
    name: 'note',
    getKey: (id: string, locale: ContentLocale) => `${locale}:${id}`,
    maxAge: 60 * 60,
    swr: true,
  }) as CachedNoteFn
  return cachedNote
})

export const getCachedNote = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string(), locale: localeSchema }))
  .handler(async ({ data: { id, locale } }) => {
    const result = await getFetchAndCompileNote()(id, locale)
    return result ? reviveDates(result) : null
  })

export async function invalidateCachedNote(id: string) {
  await Promise.all(CONTENT_LOCALES.map((locale) => getFetchAndCompileNote().invalidate(id, locale)))
}
