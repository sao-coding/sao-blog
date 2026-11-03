import { Link, createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { BackToTopFAB } from '@/components/fab'
import { pageHead } from '@/lib/seo'
import { m } from '#/paraglide/messages'
import { pageShellClass } from '@/components/layout/page-shell'
import { ListHeader } from '@/components/layout/list-parts'
import { currentContentLocale } from '@/lib/content-locale'
import { siteTime } from '@/lib/site-time'
import { anchorProps } from '@/lib/page-transition'
import type { PostListItem } from '../posts/-components/post-item'

// 分類總表：nav 第二欄只列 6 個分類，其餘的「其他 N 類 →」連到這裡。
// 跟文章列表用同一份資料（同一個 query，從文章列表過來不用再打 API），依分類分段，每類列最近三篇。
export const Route = createFileRoute('/_layout/categories/')({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(orpc.post.getPosts.queryOptions({ input: { locale: currentContentLocale() } }))
  },
  head: () =>
    pageHead({
      title: m.categories_title(),
      description: m.page_categories_description(),
      path: '/categories',
    }),
  headers: () => ({
    'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=600',
  }),
  component: CategoriesIndexPage,
})

const RECENT = 3

type CategoryGroup = { slug: string; name: string; posts: PostListItem[] }

const byDate = (a: PostListItem, b: PostListItem) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()

// 篇數多的在前（跟 nav 第二欄同一個順序），同篇數照名字
function groupByCategory(posts: PostListItem[]): CategoryGroup[] {
  const map = new Map<string, CategoryGroup>()
  for (const post of posts) {
    const group = map.get(post.category.slug) ?? { slug: post.category.slug, name: post.category.name, posts: [] }
    group.posts.push(post)
    map.set(post.category.slug, group)
  }
  return [...map.values()]
    .map((g) => ({ ...g, posts: g.posts.sort(byDate) }))
    .sort((a, b) => b.posts.length - a.posts.length || a.name.localeCompare(b.name))
}

function CategoriesIndexPage() {
  const { data, isLoading } = useQuery(orpc.post.getPosts.queryOptions({ input: { locale: currentContentLocale() } }))
  const posts = data?.status === 'success' ? data.data : []
  const groups = groupByCategory(posts)

  return (
    <>
      <div className={pageShellClass}>
        <ListHeader
          eyebrow={
            <Link to="/posts" className="transition-colors hover:text-zhu">
              {m.page_posts_title()}
            </Link>
          }
          title={m.categories_title()}
        >
          {groups.length > 0 && m.categories_subtitle({ count: String(groups.length), posts: String(posts.length) })}
        </ListHeader>

        {isLoading ? (
          <p className="py-20 text-center font-display text-ink-3">{m.list_loading()}</p>
        ) : groups.length === 0 ? (
          <p className="py-20 text-center font-display text-ink-3">{m.posts_load_failed()}</p>
        ) : (
          <div className="grid gap-x-12 gap-y-14 sm:grid-cols-2">
            {groups.map((group) => (
              <section key={group.slug} data-enter className="min-w-0">
                <h2 className="ink-row flex items-baseline gap-3 font-display">
                  <Link to="/categories/$slug" params={{ slug: group.slug }} className="ink-title text-2xl">
                    {group.name}
                  </Link>
                  <span className="text-sm text-ink-3 tabular-nums">{group.posts.length}</span>
                </h2>
                <ul className="mt-3 space-y-2">
                  {group.posts.slice(0, RECENT).map((post) => {
                    const date = siteTime(post.createdAt)
                    return (
                      <li key={post.id} className="flex items-baseline gap-3 text-sm">
                        <time dateTime={date.toISOString()} className="shrink-0 text-ink-3 tabular-nums">
                          {date.format('YYYY.MM')}
                        </time>
                        <Link
                          to="/posts/$slug"
                          params={{ slug: post.slug }}
                          className="min-w-0 truncate text-ink-2 transition-colors hover:text-zhu"
                        >
                          <span {...anchorProps(`/posts/${post.slug}`)}>{post.title}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
                {group.posts.length > RECENT && (
                  <Link
                    to="/categories/$slug"
                    params={{ slug: group.slug }}
                    className="mt-3 inline-block text-sm text-ink-3 transition-colors hover:text-zhu"
                  >
                    {m.categories_all_in({ count: String(group.posts.length) })}
                  </Link>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
      <BackToTopFAB />
    </>
  )
}
