import type { ApiResponse } from '@/types/api'
import { PostItem } from '@/types/post'
import { cookies } from 'next/headers'
import AdminShell from '../../_components/layout/admin-shell'
import { PostsTableWithActions } from './_components/table/posts-table-with-actions'

const getPosts = async () => {
  const cookieStore = await cookies()
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/posts`, {
    headers: {
      cookie: cookieStore.toString(),
    },
    next: {
      tags: ['posts'],
    },
  })
  const posts = await res.json()
  return posts
}

const PostsPage = async () => {
  const posts: ApiResponse<PostItem[]> = await getPosts()

  return (
    <AdminShell title="文章列表">
      <div>
        <PostsTableWithActions data={posts.data} />
      </div>
    </AdminShell>
  )
}

export default PostsPage
