import { Fragment, useMemo } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { orpc } from '@/lib/orpc'
import { pageHead } from '@/lib/seo'
import { cn } from '@/lib/utils'
import { m } from '#/paraglide/messages'
import { PageWithSidebar } from '@/components/layout/page-shell'
import { GroupMark, ListHeader } from '@/components/layout/list-parts'
import { PostItem, type PostListItem } from './-components/post-item'
import { PostsSidebar, type TagStat } from './-components/posts-sidebar'
import { currentContentLocale } from '@/lib/content-locale'
import { runSearch } from '@/components/search/search-api'
import { siteTime } from '@/lib/site-time'

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
    await context.queryClient.ensureQueryData(orpc.post.getPosts.queryOptions({ input: { locale: currentContentLocale() } }))
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
    const year = siteTime(post[dateKey]).year()
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
    orpc.post.getPosts.queryOptions({ input: { locale: currentContentLocale() } }),
  )
  const posts = data?.status === 'success' ? data.data : undefined
  const dateKey = sort === 'updated' ? 'updatedAt' : 'createdAt'
  const keyword = q?.trim()
  const locale = currentContentLocale()

  // 有關鍵字時用 Typesense 全文搜尋（和 ⌘K 同一個後端，內文也找得到），結果用來篩選下面的列表。
  // API proxy 一次最多 50 筆；文章數超過時只會篩出最相關的 50 篇
  const search = useQuery({
    queryKey: ['content-search', keyword, locale, 'post'],
    queryFn: () => runSearch({ q: keyword!, type: 'post', perPage: 50 }, locale),
    enabled: Boolean(keyword),
    staleTime: 30_000,
  })
  // 搜尋未啟用、出錯或還沒回來時，先用標題／摘要／分類／標籤的本地比對頂著
  const hits = useMemo(
    () => (keyword && search.data?.enabled ? new Map(search.data.hits.map((h) => [h.slug, h])) : undefined),
    [keyword, search.data],
  )

  const view = useMemo(() => {
    if (!posts) return null
    const lowered = keyword?.toLowerCase()
    const isFiltering = Boolean(tag || keyword)

    const filtered = posts.filter((post) => {
      if (tag && !post.tags.some((t) => t.slug === tag)) return false
      if (hits) return hits.has(post.slug)
      if (lowered) {
        const keyword = lowered
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
  }, [posts, sort, tag, keyword, hits, dateKey])

  const activeTagName = tag ? (view?.tags.find((t) => t.slug === tag)?.name ?? tag) : undefined

  return (
    <PageWithSidebar sidebar={<PostsSidebar tags={view?.tags ?? []} activeTag={tag} query={q} />}>
      <ListHeader title={m.page_posts_title()} titleInNav>
        {m.posts_subtitle()}
      </ListHeader>

      {/* 手機版：側欄隱藏，搜尋與標籤改放在列表上方的折疊區；有篩選條件時預設展開 */}
      {view && (
        <details open={Boolean(tag || q)} className="group/filter mb-8 lg:hidden">
          <summary className="cursor-pointer list-none font-display text-sm text-ink-3 transition-colors hover:text-zhu [&::-webkit-details-marker]:hidden">
            {m.posts_filter_toggle()}
            <span aria-hidden className="ml-1.5 inline-block transition-transform group-open/filter:rotate-90">›</span>
          </summary>
          <div className="pt-5">
            <PostsSidebar tags={view.tags} activeTag={tag} query={q} inline />
          </div>
        </details>
      )}

      {isLoading && <p className="py-20 text-center font-display text-ink-3">{m.list_loading()}</p>}

      {!isLoading && (error || !view) && (
        <ErrorBlock
          message={data?.status === 'error' ? data.message : undefined}
          onRetry={() => void refetch()}
        />
      )}

      {view && (
        <>
          <div data-enter className="flex flex-wrap items-baseline justify-between gap-3 text-sm text-ink-3">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="tabular-nums">{m.posts_total({ count: String(view.total) })}</span>
              {activeTagName && (
                <FilterChip label={m.posts_filter_tag({ tag: activeTagName })} clear={{ tag: undefined }} />
              )}
              {q && <FilterChip label={m.posts_filter_query({ q })} clear={{ q: undefined }} />}
            </div>
            <nav className="flex items-baseline">
              {SORTS.map((key, i) => (
                <Fragment key={key}>
                  {i > 0 && <span className="mx-2 text-ink-4">/</span>}
                  <Link
                    to="/posts"
                    search={(prev) => ({ ...prev, sort: key === 'newest' ? undefined : key })}
                    resetScroll={false}
                    aria-current={sort === key ? 'true' : undefined}
                    className={cn('transition-colors hover:text-zhu', sort === key && 'text-zhu')}
                  >
                    {SORT_LABEL[key]()}
                  </Link>
                </Fragment>
              ))}
            </nav>
          </div>

          {view.pinned.length > 0 && (
            <section className="mt-6">
              {view.pinned.map((post) => (
                <PostItem key={post.id} post={post} pinned />
              ))}
            </section>
          )}

          {view.groups.length === 0 ? (
            <div className="py-20 text-center font-display text-ink-3">
              <p>{m.posts_empty()}</p>
              {view.isFiltering && (
                <Link
                  to="/posts"
                  search={{ sort: sort === 'newest' ? undefined : sort }}
                  className="mt-3 inline-block text-sm text-zhu"
                >
                  {m.posts_clear_filter()}
                </Link>
              )}
            </div>
          ) : (
            view.groups.map((group) => (
              <section key={group.year} className="mt-14 first-of-type:mt-10">
                <GroupMark big={group.year} small={m.posts_year_count({ count: String(group.posts.length) })} />
                <ul>
                  {group.posts.map((post) => (
                    <li key={post.id}>
                      <PostItem post={post} dateKey={dateKey} hit={hits?.get(post.slug)} />
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
      className="text-zhu transition-colors hover:text-ink-1"
    >
      {label} ×
    </Link>
  )
}

function ErrorBlock({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <div className="py-10">
      <p className="font-display text-ink-1">{m.posts_load_failed()}</p>
      <p className="mt-1 text-sm text-ink-3">{message ?? m.posts_load_failed_hint()}</p>
      <button className="mt-3 text-sm text-zhu" onClick={onRetry}>
        {m.posts_retry()}
      </button>
    </div>
  )
}
