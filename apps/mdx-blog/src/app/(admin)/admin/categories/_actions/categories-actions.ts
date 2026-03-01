'use server'

import { revalidateTag } from 'next/cache'

export async function updateCategories() {
  revalidateTag('categories')
}
