'use client'

import { use } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ApiResponse } from '@/types/api'
import { PostItem } from '@/types/post'
import Link from 'next/link'
import { BackToTopFAB } from '@/components/fab'

const CategoriesPage = ({ params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = use(params)
  const { data, isLoading, error } = useQuery<ApiResponse<PostItem[]>>({
    queryKey: ['category', slug],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/public/posts?category=${slug}`
      )
      if (!res.ok) {
        throw new Error('Network response was not ok')
      }
      return res.json()
    },
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error loading category</div>

  return (
    <>
      {data?.data.length === 0 ? (
        <div className="mt-20 text-center text-2xl font-semibold text-foreground">
          該分類下尚無文章
        </div>
      ) : (
        <div className="mt-20">
          <div className="mx-auto mt-14 max-w-5xl px-6 lg:mt-[80px] lg:px-0 2xl:max-w-6xl">
            <header className="prose mb-8 max-w-none">
              <h1 className="text-3xl font-extrabold text-foreground">
                分類：{slug}
              </h1>
              <p className="mt-2 text-muted-foreground">
                瀏覽分類「{slug}」下的所有文章。
              </p>
            </header>
            <ul className="timeline-list relative ml-4">
              {/* 時間線 */}
              {data?.data.map((post) => (
                <li
                  key={post.id}
                  className="timeline-item flex min-w-0 items-center justify-between leading-loose space-x-2"
                >
                  <Link
                    href={`/posts/${post.slug}`}
                    className="sao-link text-foreground group-hover:text-primary transition-colors duration-200 no-underline! truncate"
                  >
                    {post.title}
                  </Link>

                  {/* Date */}
                  <span className="text-muted-foreground font-mono shrink-0">
                    {post.updatedAt.slice(0, 10)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <BackToTopFAB />
    </>
  )
}

export default CategoriesPage
// interface Article {
//   id: string
//   title: string
//   date: string
// }

// interface TimelineArticleProps {
//   articles: Article[]
// }

// export function TimelineArticle({ articles }: TimelineArticleProps) {
//   return (
//     <div className="max-w-2xl mx-auto px-6 py-8">
//       <div className="relative">
//         {/* Vertical timeline line */}
//         <div className="absolute left-4 top-0 bottom-0 w-px bg-border"></div>

//         <div className="space-y-1">
//           {articles.map((article) => (
//             <div
//               key={article.id}
//               className="relative flex items-center justify-between py-2 px-3 hover:bg-muted/50 rounded-md transition-colors duration-200 group"
//             >
//               {/* Icon and title */}
//               <div className="flex items-center gap-3">
//                 <div className="relative z-10 w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
//                 <span className="text-foreground group-hover:text-primary transition-colors duration-200">
//                   {article.title}
//                 </span>
//               </div>

//               {/* Date */}
//               <span className="text-sm text-muted-foreground font-mono">{article.date}</span>
//             </div>
//           ))}
//         </div>
//       </div>
//     </div>
//   )
// }
