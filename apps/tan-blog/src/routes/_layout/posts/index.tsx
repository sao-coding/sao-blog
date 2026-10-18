import { useMemo } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { XIcon } from 'lucide-react'
import { z } from 'zod'
import { orpc } from '@/lib/orpc'
import { pageHead } from '@/lib/seo'
import { cn } from '@/lib/utils'
import { m } from '#/paraglide/messages'
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

function sortPosts(posts: PostListItem[], sort: Sort) {
  const time = (d: Date) => new Date(d).getTime()
  return [...posts].sort((a, b) => {
    if (sort === 'oldest') return time(a.createdAt) - time(b.createdAt)
    if (sort === 'updated') return time(b.updatedAt) - time(a.updatedAt)
    return time(b.createdAt) - time(a.createdAt)
  })
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
    const pinned = isFiltering
      ? []
      : posts.filter((p) => p.pin).sort((a, b) => a.pinOrder - b.pinOrder)
    const list = sortPosts(isFiltering ? filtered : filtered.filter((p) => !p.pin), sort)

    return { pinned, list, total: filtered.length, tags: collectTags(posts), isFiltering }
  }, [posts, sort, tag, q])

  const activeTagName = tag ? view?.tags.find((t) => t.slug === tag)?.name ?? tag : undefined

  return (
    <div className="mx-auto mt-28 w-full max-w-5xl px-4 pb-24 lg:mt-32">
      <header className="mb-8">
        <p className="text-xs tracking-[0.3em] text-muted-foreground">{m.posts_eyebrow()}</p>
        <h1 className="mt-2 text-3xl font-bold">{m.page_posts_title()}</h1>
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_240px]">
        <main className="min-w-0">
          {isLoading && <ListSkeleton />}

          {!isLoading && (error || !view) && (
            <ErrorBlock
              message={data?.status === 'error' ? data.message : undefined}
              onRetry={() => void refetch()}
            />
          )}

          {view && (
            <>
              {view.pinned.length > 0 && (
                <div className="mb-6 flex flex-col gap-3">
                  {view.pinned.map((post) => (
                    <PostItem key={post.id} post={post} variant="pinned" />
                  ))}
                </div>
              )}

              <div className="mb-2 flex flex-wrap items-center justify-between gap-3 border-b pb-3 text-xs text-muted-foreground">
                <div className="flex flex-wrap items-center gap-2">
                  <span>{m.posts_total({ count: String(view.total + view.pinned.length) })}</span>
                  {activeTagName && (
                    <FilterChip label={m.posts_filter_tag({ tag: activeTagName })} clear={{ tag: undefined }} />
                  )}
                  {q && <FilterChip label={m.posts_filter_query({ q })} clear={{ q: undefined }} />}
                </div>
                <nav className="flex items-center gap-3">
                  {SORTS.map((key) => (
                    <Link
                      key={key}
                      to="/posts"
                      search={(prev) => ({ ...prev, sort: key === 'newest' ? undefined : key })}
                      resetScroll={false}
                      className={cn(
                        'relative pb-0.5 transition-colors hover:text-foreground',
                        sort === key && 'text-primary',
                      )}
                    >
                      {SORT_LABEL[key]()}
                      {sort === key && (
                        <motion.span
                          layoutId="posts-sort-indicator"
                          className="absolute inset-x-0 -bottom-0.5 h-px bg-primary"
                        />
                      )}
                    </Link>
                  ))}
                </nav>
              </div>

              {view.list.length === 0 ? (
                <div className="py-16 text-center text-sm text-muted-foreground">
                  <p>{m.posts_empty()}</p>
                  {view.isFiltering && (
                    <Link to="/posts" search={{ sort: sort === 'newest' ? undefined : sort }} className="mt-3 inline-block text-primary">
                      {m.posts_clear_filter()}
                    </Link>
                  )}
                </div>
              ) : (
                <ul className="flex flex-col">
                  {view.list.map((post, i) => (
                    <li
                      key={post.id}
                      className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-300"
                      style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
                    >
                      <PostItem post={post} />
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </main>

        <div className="hidden lg:block">
          <PostsSidebar tags={view?.tags ?? []} activeTag={tag} query={q} />
        </div>
      </div>
    </div>
  )
}

function FilterChip({ label, clear }: { label: string; clear: Partial<z.infer<typeof searchSchema>> }) {
  return (
    <Link
      to="/posts"
      search={(prev) => ({ ...prev, ...clear })}
      resetScroll={false}
      className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-primary hover:bg-primary/20"
    >
      {label}
      <XIcon className="size-3" />
    </Link>
  )
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="animate-pulse space-y-2">
          <div className="h-5 w-2/3 rounded bg-muted" />
          <div className="h-3 w-full rounded bg-muted" />
          <div className="h-3 w-1/3 rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}

function ErrorBlock({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-destructive/40 bg-destructive/10 p-4">
      <div>
        <p className="font-medium text-destructive">{m.posts_load_failed()}</p>
        <p className="text-sm text-muted-foreground">{message ?? m.posts_load_failed_hint()}</p>
      </div>
      <button
        className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-95"
        onClick={onRetry}
      >
        {m.posts_retry()}
      </button>
    </div>
  )
}
