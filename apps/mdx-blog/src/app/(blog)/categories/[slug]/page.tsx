'use client'

import { use } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BackToTopFAB } from '@/components/fab'
import { orpc } from '@/lib/orpc'
import { TimeLineList } from '@/components/timeline-list'

const CategoriesPage = ({ params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = use(params)

  const { data, isLoading, error } = useQuery(orpc.post.getPosts.queryOptions({ input: { category: slug } }))

  if (isLoading) return <div>Loading...</div>;

  // 👉 這行是關鍵（一定要先判斷 status）
  if (error || !data || data.status === "error") {
    return <div>Error loading category</div>;
  }

  // 👉 這裡開始 TS 會知道 data.data 一定不是 null
  const posts = data.data;

  return (
    <>
      {posts.length === 0 ? (
        <div className="mt-20 text-center text-2xl font-semibold text-foreground">
          該分類下尚無文章
        </div>
      ) : (
        <div className="mt-20">
          <div className="mx-auto mt-14 max-w-5xl px-6 lg:mt-[80px] lg:px-0 2xl:max-w-6xl">
            <div className="relative pl-6">
              <div className="absolute left-0 top-0 bottom-0 w-px bg-muted-foreground/30" />
              <header className="mb-8 max-w-none">
                <h1 className="text-3xl font-extrabold text-foreground">
                  分類 - {slug}
                </h1>
                <p className="mt-2 text-muted-foreground">
                  當前共有 {posts.length} 篇文章，加油！
                </p>
              </header>
              <TimeLineList
                articles={posts.map((post) => ({
                  id: post.id,
                  title: post.title,
                  slug: post.slug,
                  createdAt: post.createdAt,
                  updatedAt: post.updatedAt,
                }))}
              />
            </div>
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
