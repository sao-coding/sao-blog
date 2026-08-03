import { createServerFn } from '@tanstack/react-start'
import { defineCachedFunction } from 'nitro/cache'
import { z } from 'zod'
import { client } from '@/lib/orpc'
import { compileMdxSource } from '@/lib/mdx/compile-source'
import { reviveDates } from './revive-dates'

async function fetchAndCompileNoteImpl(id: string) {
  const res = await client.note.getNote({ id })
  if (!res.data) return null
  const mdx = await compileMdxSource(res.data.content, 'basic')
  return { ...res.data, ...mdx }
}

const fetchAndCompileNote = defineCachedFunction(fetchAndCompileNoteImpl, {
  name: 'note',
  getKey: (id: string) => id,
  maxAge: 60 * 60,
  swr: true,
}) as typeof fetchAndCompileNoteImpl & { invalidate: (id: string) => Promise<void> }

export const getCachedNote = createServerFn({ method: 'GET' })
  .validator(z.string())
  .handler(async ({ data: id }) => {
    const result = await fetchAndCompileNote(id)
    return result ? reviveDates(result) : null
  })

export async function invalidateCachedNote(id: string) {
  await fetchAndCompileNote.invalidate(id)
}
