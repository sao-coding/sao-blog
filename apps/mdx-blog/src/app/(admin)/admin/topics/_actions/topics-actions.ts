'use server'

import { revalidateTag } from 'next/cache'

export async function updateTopics() {
  revalidateTag('topics')
}
