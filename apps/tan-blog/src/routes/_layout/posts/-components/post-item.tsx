import { Link } from '@tanstack/react-router'
import type z from 'zod'
import type { postSchema } from '@sao-blog/api/schema/post'
import { cn } from '@/lib/utils'
import { m } from '#/paraglide/messages'
import { TermMark } from '@/components/written-season'
import type { SearchHit } from '@sao-blog/api/lib/search/query'
import { Highlighted, SearchSnippet } from '@/components/search/search-hit'
import { siteTime } from '@/lib/site-time'
import { isLastViewedPost, postTitleTransitionName } from '@/lib/post-transitions'

export type PostListItem = z.infer<typeof postSchema>

const MAX_VISIBLE_TAGS = 2

// 筆記本風格的一列：左側月/日小字當「頁邊註記」，右側標題＋一行摘要＋分類標籤。
// 不用卡片與背景色，靠虛線橫線分隔；hover 時標題底下像用筆劃過一條墨線。
// 標題 Link 的 ::after 撐滿整列當點擊區，分類/標籤連結用 relative z-10 疊在上層，
// 避免 <a> 巢狀 <a>。
export function PostItem({
  post,
  dateKey = 'createdAt',
  pinned = false,
  hit,
}: {
  post: PostListItem
  dateKey?: 'createdAt' | 'updatedAt'
  pinned?: boolean
  /** 搜尋中：標題高亮、摘要換成內文命中的片段（與 ⌘K 同一套 Highlighted） */
  hit?: SearchHit
}) {
  const date = siteTime(post[dateKey])
  const extraTags = post.tags.length - MAX_VISIBLE_TAGS

  return (
    <article className="group relative grid grid-cols-[3.75rem_minmax(0,1fr)] gap-x-4 border-b border-dashed border-rule py-5 sm:grid-cols-[4.5rem_minmax(0,1fr)]">
      <div className="pt-1 font-mono text-sm leading-none text-muted-foreground tabular-nums sm:text-lg">
        {pinned ? (
          <span className="font-wenkai text-sm text-ink">{m.posts_pinned()}</span>
        ) : (
          <>
            <time dateTime={date.toISOString()}>{date.format('MM.DD')}</time>
            {/* 寫作當時的節氣 */}
            <TermMark date={post[dateKey]} className="mt-2 block text-sm leading-none sm:text-base" />
          </>
        )}
      </div>

      <div className="min-w-0">
        {/* 標題與文章頁的 h1 共用 view-transition-name：點下去時才掛上（同名一頁只能一個），
            從文章回來時，剛看完的那一列預先掛著，標題才飛得回來 */}
        <h2
          className="font-wenkai text-lg leading-snug text-foreground [view-transition-class:post-title] sm:text-xl"
          style={isLastViewedPost(post.slug) ? { viewTransitionName: postTitleTransitionName(post.slug) } : undefined}
        >
          <Link
            to="/posts/$slug"
            params={{ slug: post.slug }}
            onClick={(e) => {
              const title = e.currentTarget.parentElement
              if (title) title.style.viewTransitionName = postTitleTransitionName(post.slug)
            }}
            className={cn(
              'bg-[linear-gradient(var(--ink),var(--ink))] bg-no-repeat [background-position:0_100%] [background-size:0%_1px]',
              'transition-[background-size,color] duration-500 ease-out',
              'group-hover:text-ink group-hover:[background-size:100%_1px]',
              "after:absolute after:inset-0 after:content-['']",
            )}
          >
            {hit?.titleHighlight ? <Highlighted text={hit.titleHighlight} /> : post.title}
          </Link>
        </h2>

        {hit?.snippet ? (
          <SearchSnippet hit={hit} className="mt-1.5 line-clamp-3 sm:line-clamp-2" />
        ) : post.summary && (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground sm:line-clamp-1">
            {post.summary}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <Link
            to="/categories/$slug"
            params={{ slug: post.category.slug }}
            className="relative z-10 text-foreground/70 transition-colors hover:text-ink"
          >
            {post.category.name}
          </Link>
          {post.tags.slice(0, MAX_VISIBLE_TAGS).map((tag) => (
            <Link
              key={tag.id}
              to="/posts"
              search={(prev) => ({ ...prev, tag: tag.slug })}
              resetScroll={false}
              className="relative z-10 transition-colors hover:text-ink"
            >
              #{tag.name}
            </Link>
          ))}
          {extraTags > 0 && <span>+{extraTags}</span>}
          <span className="ml-auto font-mono tabular-nums opacity-70">
            <span title={m.posts_views({ count: String(post.viewCount) })}>{m.posts_views_short({ count: String(post.viewCount) })}</span>
            <span className="mx-1.5">·</span>
            <span title={m.posts_comments({ count: String(post.commentCount) })}>{m.posts_comments_short({ count: String(post.commentCount) })}</span>
          </span>
        </div>
      </div>
    </article>
  )
}
