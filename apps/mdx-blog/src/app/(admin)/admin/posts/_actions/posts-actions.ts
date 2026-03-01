'use server'

import { revalidateTag } from 'next/cache'

/**
 * Server action to revalidate the posts tag.
 * Exported from a server file so it can be imported into client components.
 */
export async function postsUpdate() {
  console.log('Server action: revalidating posts')
  revalidateTag('posts')
}

/**
 * Server action to delete multiple posts
 */
export async function deletePosts(postIds: string[]) {
  try {
    // 這裡需要根據你的 API 實現來調整
    // 假設有一個批量刪除的 API endpoint
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/admin/posts/batch-delete`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: postIds }),
      }
    )

    if (!response.ok) {
      throw new Error('Failed to delete posts')
    }

    // 成功後重新驗證標籤以更新列表
    await postsUpdate()

    return { success: true }
  } catch (error) {
    console.error('Failed to delete posts:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
