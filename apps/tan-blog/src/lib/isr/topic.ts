import { createServerFn } from '@tanstack/react-start'
import { defineCachedFunction } from 'nitro/cache'
import { z } from 'zod'
import { client } from '@/lib/orpc'
import { reviveDates } from './revive-dates'

async function fetchTopicImpl(slug: string) {
  const res = await client.topic.getTopicBySlug({ slug })
  if (!res || res.status === 'error' || !res.data) return null
  return res.data
}

const fetchTopic = defineCachedFunction(fetchTopicImpl, {
  name: 'topic',
  getKey: (slug: string) => slug,
  maxAge: 60 * 60,
  swr: true,
}) as typeof fetchTopicImpl & { invalidate: (slug: string) => Promise<void> }

export const getCachedTopic = createServerFn({ method: 'GET' })
  .validator(z.string())
  .handler(async ({ data: slug }) => {
    const result = await fetchTopic(slug)
    return result ? reviveDates(result) : null
  })

export async function invalidateCachedTopic(slug: string) {
  await fetchTopic.invalidate(slug)
}
