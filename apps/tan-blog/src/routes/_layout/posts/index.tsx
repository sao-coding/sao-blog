import { Fragment, useMemo } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { orpc } from '@/lib/orpc'
import { pageHead } from '@/lib/seo'
import { cn } from '@/lib/utils'
import { m } from '#/paraglide/messages'
import { PageWithSidebar } from '@/components/layout/page-shell'
import { PostItem, type PostListItem } from './-components/post-item'
import { PostsSidebar, type TagStat } from './-components/posts-sidebar'

const SORTS = ['newest', 'oldest', 'updated'] as const
type Sort = (typeof SORTS)[number]

// 排序/標籤/搜尋都放在 URL search params：可分享、可上一頁，SSR 也能直接渲染出結果。
const searchSchema = z.object({
  sort: z.enum(SORTS).optional().catch(undefined),
  tag: z.string().optional().catch(undefined),
  q: z.string().optional().catch(undefined),
})

export const Route = createFileRoute('/_layout/posts/')({
  validateSearch: searchSchema,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(orpc.post.getPosts.queryOptions({ input: {} }))
  },
  head: () =>
    pageHead({
      title: m.page_posts_title(),
      description: m.page_posts_description(),
      path: '/posts',
    }),
  headers: () => ({
    'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=600',
  }),
  component: PostsIndexPage,
})

const SORT_LABEL: Record<Sort, () => string> = {
  newest: m.posts_sort_newest,
  oldest: m.posts_sort_oldest,
  updated: m.posts_sort_updated,
}

const time = (d: Date) => new Date(d).getTime()

function sortPosts(posts: PostListItem[], sort: Sort) {
  return [...posts].sort((a, b) => {
    if (sort === 'oldest') return time(a.createdAt) - time(b.createdAt)
    if (sort === 'updated') return time(b.updatedAt) - time(a.updatedAt)
    return time(b.createdAt) - time(a.createdAt)
  })
}

// 已排序的清單依年份切段；年份取排序所依據的日期（最近更新 → updatedAt）
function groupByYear(posts: PostListItem[], dateKey: 'createdAt' | 'updatedAt') {
  const groups: { year: number; posts: PostListItem[] }[] = []
  for (const post of posts) {
    const year = new Date(post[dateKey]).getFullYear()
    const last = groups.at(-1)
    if (last?.year === year) last.posts.push(post)
    else groups.push({ year, posts: [post] })
  }
  return groups
}

function collectTags(posts: PostListItem[]): TagStat[] {
  const map = new Map<string, TagStat>()
  for (const post of posts) {
    for (const tag of post.tags) {
      const stat = map.get(tag.slug) ?? { slug: tag.slug, name: tag.name, count: 0 }
      stat.count++
      map.set(tag.slug, stat)
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

function PostsIndexPage() {
  const { sort = 'newest', tag, q } = Route.useSearch()
  const { data, error, isLoading, refetch } = useQuery(
    orpc.post.getPosts.queryOptions({ input: {} }),
  )
  const posts = data?.status === 'success' ? data.data : undefined
  const dateKey = sort === 'updated' ? 'updatedAt' : 'createdAt'

  const view = useMemo(() => {
    if (!posts) return null
    const keyword = q?.trim().toLowerCase()
    const isFiltering = Boolean(tag || keyword)

    const filtered = posts.filter((post) => {
      if (tag && !post.tags.some((t) => t.slug === tag)) return false
      if (keyword) {
        const haystack = [post.title, post.summary ?? '', post.category.name, ...post.tags.map((t) => t.name)]
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(keyword)) return false
      }
      return true
    })

    // 篩選中不另外拉出置頂，避免置頂文章不符條件卻還出現在最上面
    const pinned = isFiltering ? [] : posts.filter((p) => p.pin).sort((a, b) => a.pinOrder - b.pinOrder)
    const rest = sortPosts(isFiltering ? filtered : filtered.filter((p) => !p.pin), sort)

    return {
      pinned,
      groups: groupByYear(rest, dateKey),
      total: filtered.length,
      tags: collectTags(posts),
      isFiltering,
    }
  }, [posts, sort, tag, q, dateKey])

  const activeTagName = tag ? (view?.tags.find((t) => t.slug === tag)?.name ?? tag) : undefined

  return (
    <PageWithSidebar sidebar={<PostsSidebar tags={view?.tags ?? []} activeTag={tag} query={q} />}>
      <header className="mb-10">
        <h1 className="font-wenkai text-4xl text-foreground">{m.page_posts_title()}</h1>
        <p className="mt-3 font-wenkai text-sm text-muted-foreground">{m.posts_subtitle()}</p>
      </header>

      {/* 手機版：側欄隱藏，搜尋與標籤改放在列表上方的折疊區；有篩選條件時預設展開 */}
      {view && (
        <details open={Boolean(tag || q)} className="mb-8 rounded-xl border border-rule bg-card/40 lg:hidden">
          <summary className="cursor-pointer px-4 py-3 font-wenkai text-sm text-muted-foreground">
            {m.posts_filter_toggle()}
          </summary>
          <div className="px-4 pb-4">
            <PostsSidebar tags={view.tags} activeTag={tag} query={q} inline />
          </div>
        </details>
      )}

      {isLoading && <ListSkeleton />}

      {!isLoading && (error || !view) && (
        <ErrorBlock
          message={data?.status === 'error' ? data.message : undefined}
          onRetry={() => void refetch()}
        />
      )}

      {view && (
        <>
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-rule pb-3 text-xs text-muted-foreground">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="font-mono tabular-nums">{m.posts_total({ count: String(view.total) })}</span>
              {activeTagName && (
                <FilterChip label={m.posts_filter_tag({ tag: activeTagName })} clear={{ tag: undefined }} />
              )}
              {q && <FilterChip label={m.posts_filter_query({ q })} clear={{ q: undefined }} />}
            </div>
            <nav className="flex items-baseline">
              {SORTS.map((key, i) => (
                <Fragment key={key}>
                  {i > 0 && <span className="mx-2 text-rule">/</span>}
                  <Link
                    to="/posts"
                    search={(prev) => ({ ...prev, sort: key === 'newest' ? undefined : key })}
                    resetScroll={false}
                    className={cn(
                      'transition-colors hover:text-foreground',
                      sort === key && 'text-ink underline decoration-ink/50 underline-offset-4',
                    )}
                  >
                    {SORT_LABEL[key]()}
                  </Link>
                </Fragment>
              ))}
            </nav>
          </div>

          {view.pinned.length > 0 && (
            <section className="mt-2">
              {view.pinned.map((post) => (
                <PostItem key={post.id} post={post} pinned />
              ))}
            </section>
          )}

          {view.groups.length === 0 ? (
            <div className="py-20 text-center font-wenkai text-muted-foreground">
              <p>{m.posts_empty()}</p>
              {view.isFiltering && (
                <Link
                  to="/posts"
                  search={{ sort: sort === 'newest' ? undefined : sort }}
                  className="mt-3 inline-block text-sm text-ink underline underline-offset-4"
                >
                  {m.posts_clear_filter()}
                </Link>
              )}
            </div>
          ) : (
            view.groups.map((group) => (
              <section key={group.year} className="relative mt-12 first-of-type:mt-8">
                <h2 className="mb-1 flex items-baseline gap-3 font-wenkai">
                  <span className="text-5xl leading-none text-ink/25 tabular-nums select-none">{group.year}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {m.posts_year_count({ count: String(group.posts.length) })}
                  </span>
                </h2>
                <ul>
                  {group.posts.map((post) => (
                    <li key={post.id}>
                      <PostItem post={post} dateKey={dateKey} />
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </>
      )}
    </PageWithSidebar>
  )
}

function FilterChip({ label, clear }: { label: string; clear: Partial<z.infer<typeof searchSchema>> }) {
  return (
    <Link
      to="/posts"
      search={(prev) => ({ ...prev, ...clear })}
      resetScroll={false}
      className="text-ink underline decoration-dashed underline-offset-4 hover:decoration-solid"
    >
      {label} ×
    </Link>
  )
}

function ListSkeleton() {
  return (
    <div className="flex flex-col">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="animate-pulse space-y-2 border-b border-dashed border-rule py-5 pl-20">
          <div className="h-5 w-2/3 rounded bg-muted" />
          <div className="h-3 w-full rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}

function ErrorBlock({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <div className="border-l-2 border-destructive/60 py-2 pl-4">
      <p className="font-wenkai text-destructive">{m.posts_load_failed()}</p>
      <p className="mt-1 text-sm text-muted-foreground">{message ?? m.posts_load_failed_hint()}</p>
      <button className="mt-3 text-sm text-ink underline underline-offset-4" onClick={onRetry}>
        {m.posts_retry()}
      </button>
    </div>
  )
}
