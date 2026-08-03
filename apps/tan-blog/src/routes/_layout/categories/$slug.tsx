import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { BackToTopFAB } from '@/components/fab'
import { pageHead } from '@/lib/seo'
import { m } from '#/paraglide/messages'
import { CategoriesTimeline } from './-components/categories-timeline'

export const Route = createFileRoute('/_layout/categories/$slug')({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(
      orpc.post.getPosts.queryOptions({ input: { category: params.slug } })
    )
  },
  head: ({ params }) => pageHead({
    title: m.page_category_title({ slug: params.slug }),
    description: m.page_category_description({ slug: params.slug }),
    path: `/categories/${params.slug}`,
  }),
  headers: () => ({
    'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=600',
  }),
  component: CategoryDetailPage,
})

function CategoryDetailPage() {
  const { slug } = Route.useParams()

  const { data, isLoading, error } = useQuery(
    orpc.post.getPosts.queryOptions({ input: { category: slug } })
  )

  if (isLoading) return <div>Loading...</div>

  if (error || !data || data.status === 'error') {
    return <div>Error loading category</div>
  }

  const posts = data.data

  return (
    <>
      {posts.length === 0 ? (
        <div className="mt-20 text-center text-2xl font-semibold text-foreground">
          該分類下尚無文章
        </div>
      ) : (
        <div className="mt-20">
          <div className="mx-auto mt-14 max-w-5xl px-6 lg:mt-[80px] lg:px-0 2xl:max-w-6xl">
            <div className="relative pl-[19px] border-l-2">
              <header className="mb-8 max-w-none">
                <h1 className="text-4xl font-bold text-foreground">
                  分類 - {slug}
                </h1>
                <p className="mt-2 text-muted-foreground">
                  當前共有 {posts.length} 篇文章，加油！
                </p>
              </header>
              <CategoriesTimeline
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
