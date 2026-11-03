import { Link, createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { BackToTopFAB } from '@/components/fab'
import { pageHead } from '@/lib/seo'
import { m } from '#/paraglide/messages'
import { pageShellClass } from '@/components/layout/page-shell'
import { GroupMark, ListHeader } from '@/components/layout/list-parts'
import { currentContentLocale } from '@/lib/content-locale'
import { siteTime } from '@/lib/site-time'
import { PostItem, type PostListItem } from '../posts/-components/post-item'

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

// 新→舊依年份切段（跟文章列表同一套列）
function groupByYear(posts: PostListItem[]) {
  const groups: { year: number; posts: PostListItem[] }[] = []
  const sorted = [...posts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  for (const post of sorted) {
    const year = siteTime(post.createdAt).year()
    const last = groups.at(-1)
    if (last?.year === year) last.posts.push(post)
    else groups.push({ year, posts: [post] })
  }
  return groups
}

function CategoryDetailPage() {
  const { slug } = Route.useParams()

  const { data, isLoading, error } = useQuery(
    orpc.post.getPosts.queryOptions({ input: { category: slug, locale: currentContentLocale() } })
  )
  const posts = data?.status === 'success' ? data.data : []
  // 分類的名字跟著文章來（API 依語系給），沒有文章時只好寫 slug
  const name = posts[0]?.category.name ?? slug

  return (
    <>
      <div className={pageShellClass}>
        <ListHeader
          eyebrow={
            <Link to="/categories" className="transition-colors hover:text-zhu">
              {m.categories_title()}
            </Link>
          }
          title={name}
        >
          {!isLoading && m.posts_total({ count: String(posts.length) })}
        </ListHeader>

        {isLoading ? (
          <p className="py-20 text-center font-display text-ink-3">{m.list_loading()}</p>
        ) : error || data?.status === 'error' ? (
          <p className="py-20 text-center font-display text-ink-3">{m.posts_load_failed()}</p>
        ) : posts.length === 0 ? (
          <p className="py-20 text-center font-display text-ink-3">{m.categories_empty()}</p>
        ) : (
          groupByYear(posts).map((group) => (
            <section key={group.year} className="mt-14 first-of-type:mt-0">
              <GroupMark big={group.year} small={m.posts_year_count({ count: String(group.posts.length) })} />
              <ul>
                {group.posts.map((post) => (
                  <li key={post.id}>
                    <PostItem post={post} />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
      <BackToTopFAB />
    </>
  )
}
