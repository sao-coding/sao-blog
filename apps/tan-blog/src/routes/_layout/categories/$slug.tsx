import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { BackToTopFAB } from '@/components/fab'
import { pageHead } from '@/lib/seo'
import { m } from '#/paraglide/messages'
import { CategoriesTimeline } from './-components/categories-timeline'
import { pageShellClass } from '@/components/layout/page-shell'
import { GardenLayer } from '@/components/garden/garden-layer'
import { currentContentLocale } from '@/lib/content-locale'

export const Route = createFileRoute('/_layout/categories/$slug')({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(
      orpc.post.getPosts.queryOptions({ input: { category: params.slug, locale: currentContentLocale() } })
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
    orpc.post.getPosts.queryOptions({ input: { category: slug, locale: currentContentLocale() } })
  )

  if (isLoading) {
    return <div className="mt-40 text-center font-wenkai text-muted-foreground">載入中…</div>
  }

  if (error || !data || data.status === 'error') {
    return <div className="mt-40 text-center font-wenkai text-destructive">分類載入失敗</div>
  }

  const posts = data.data

  return (
    <>
      <GardenLayer stones={false} />
      {posts.length === 0 ? (
        <div className="mt-40 text-center font-wenkai text-xl text-muted-foreground">
          該分類下尚無文章
        </div>
      ) : (
        // 版面比照 /timeline：文楷標題＋細墨線串起的列表
        <div className={pageShellClass}>
          <header className="mb-10">
            <p className="font-wenkai text-sm text-muted-foreground">分類</p>
            <h1 className="mt-1 font-wenkai text-4xl text-foreground">{slug}</h1>
            <p className="mt-3 flex items-baseline gap-1.5 font-wenkai text-sm text-muted-foreground">
              共
              <span className="text-2xl leading-none text-ink tabular-nums">{posts.length}</span>
              篇，加油！
            </p>
          </header>
          <div className="relative ml-1 border-l border-rule">
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
      )}
      <BackToTopFAB />
    </>
  )
}
