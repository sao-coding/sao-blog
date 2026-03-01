'use client'

import { useQuery } from '@tanstack/react-query'
import { ApiResponse } from '@/types/api'
import { TopicItem } from '@/types/topic'
import Link from 'next/link'

const NoteTopicsPage = () => {
  const { data, isLoading, error } = useQuery<ApiResponse<TopicItem[]>>({
    queryKey: ['topics'],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/public/topics`
      )
      if (!res.ok) {
        throw new Error('Network response was not ok')
      }
      return res.json()
    },
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error loading topics</div>

  return (
    <>
      {data?.data.length === 0 ? (
        <div className="mt-20 text-center text-2xl font-semibold text-foreground">
          尚無專欄
        </div>
      ) : (
        <div className="mt-20">
          <div className="mx-auto mt-14 max-w-5xl px-6 lg:mt-[80px] lg:px-0 2xl:max-w-6xl">
            <header className="prose mb-8 max-w-none">
              <h1 className="text-3xl font-extrabold text-foreground">
                專欄列表
              </h1>
              <p className="mt-2 text-muted-foreground">瀏覽所有專欄。</p>
            </header>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {data?.data.map((topic) => (
                <Link
                  href={`/notes/topics/${topic.slug}`}
                  key={topic.id}
                  className="no-underline"
                >
                  <div className="group h-full rounded-lg border p-6 transition-all hover:border-primary">
                    <h2 className="text-xl font-bold text-foreground group-hover:text-primary">
                      {topic.name}
                    </h2>
                    <p className="mt-2 text-muted-foreground">
                      {topic.introduce}
                    </p>
                    <p className="mt-4 text-sm text-muted-foreground">
                      {topic.noteCount} 篇筆記
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default NoteTopicsPage
