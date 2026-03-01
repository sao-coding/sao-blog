'use client'

import { ApiResponse } from '@/types/api'
import { PostItem as PostType } from '@/types/post'
import { useQuery } from '@tanstack/react-query'
import { PostItem } from './_components/post-item'
import { useState } from 'react'
import { orpc } from '@/lib/orpc'

const SkeletonCard = () => (
  <div className="animate-pulse rounded-lg border bg-surface-50 p-6 shadow-sm">
    <div className="h-6 w-3/4 rounded bg-gray-200"></div>
    <div className="mt-4 h-3 w-1/2 rounded bg-gray-200"></div>
    <div className="mt-6 flex gap-3">
      <div className="h-8 w-20 rounded bg-gray-200"></div>
      <div className="h-8 w-12 rounded bg-gray-200"></div>
    </div>
  </div>
)

const PostsPage = () => {
  const [staleKey, setStaleKey] = useState(0)
  // const { data, error, isLoading, refetch } = useQuery<ApiResponse<PostType[]>>(
  //   {
  //     queryKey: ['posts', staleKey],
  //     queryFn: async () => {
  //       const res = await fetch(
  //         `${process.env.NEXT_PUBLIC_API_URL}/public/posts`
  //       )
  //       if (!res.ok) {
  //         throw new Error('Network response was not ok')
  //       }
  //       return res.json()
  //     },
  //   }
  // )

  const { data, error, isLoading, refetch } = useQuery(
    orpc.post.getPosts.queryOptions()
  )
  
  return (
    <div className="mt-20">
      <div className="mx-auto mt-14 max-w-3xl px-2 lg:mt-[80px] lg:px-0 2xl:max-w-4xl">
        {isLoading && (
          <div className="flex flex-col gap-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {error && (
          <div className="flex items-center justify-between rounded-lg border bg-red-50 p-4">
            <div>
              <p className="font-medium text-red-700">載入文章失敗</p>
              <p className="text-sm text-red-600">請檢查網路或稍後再試。</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-95"
                onClick={() => {
                  // 重新嘗試並更新 key 以強制 refetch cache
                  setStaleKey((k) => k + 1)
                  void refetch()
                }}
              >
                重試
              </button>
            </div>
          </div>
        )}

        {!isLoading && !error && (
          <ul className="flex flex-col">
            {data?.data.map((post) => (
              <li key={post.id}>
                <PostItem post={post} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default PostsPage
