import { createServerFn } from '@tanstack/react-start'
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

const fetchAndCompileNote = defineCachedFunction(fetchAndCompileNoteImpl, {
  name: 'note',
  getKey: (id: string, locale: ContentLocale) => `${locale}:${id}`,
  maxAge: 60 * 60,
  swr: true,
}) as typeof fetchAndCompileNoteImpl & {
  invalidate: (id: string, locale: ContentLocale) => Promise<void>
}

export const getCachedNote = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string(), locale: localeSchema }))
  .handler(async ({ data: { id, locale } }) => {
    const result = await fetchAndCompileNote(id, locale)
    return result ? reviveDates(result) : null
  })

export async function invalidateCachedNote(id: string) {
  await Promise.all(CONTENT_LOCALES.map((locale) => fetchAndCompileNote.invalidate(id, locale)))
}
