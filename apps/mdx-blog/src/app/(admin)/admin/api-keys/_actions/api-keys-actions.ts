'use server'

import { revalidateTag } from 'next/cache'

/**
 * Server action to revalidate the api-keys tag.
 * Exported from a server file so it can be imported into client components.
 */
export async function updateApiKeys() {
  console.log('Server action: revalidating api-keys')
  revalidateTag('api-keys')
}
