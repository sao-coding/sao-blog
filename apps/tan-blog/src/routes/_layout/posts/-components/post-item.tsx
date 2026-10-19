import { Link } from '@tanstack/react-router'
import dayjs from 'dayjs'
import type z from 'zod'
import type { postSchema } from '@sao-blog/api/schema/post'
import { cn } from '@/lib/utils'
import { m } from '#/paraglide/messages'
import { TermMark } from '@/components/written-season'

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
}: {
  post: PostListItem
  dateKey?: 'createdAt' | 'updatedAt'
  pinned?: boolean
}) {
  const date = dayjs(post[dateKey])
  const extraTags = post.tags.length - MAX_VISIBLE_TAGS

  return (
    <article className="group relative grid grid-cols-[3.25rem_minmax(0,1fr)] gap-x-4 border-b border-dashed border-rule py-5 sm:grid-cols-[4rem_minmax(0,1fr)]">
      <div className="pt-1 font-mono text-xs leading-none text-muted-foreground tabular-nums">
        {pinned ? (
          <span className="font-wenkai text-sm text-ink">{m.posts_pinned()}</span>
        ) : (
          <>
            <time dateTime={date.toISOString()}>{date.format('MM.DD')}</time>
            {/* 寫作當時的節氣 */}
            <TermMark date={post[dateKey]} className="mt-1.5 block text-[0.7rem] leading-none" />
          </>
        )}
      </div>

      <div className="min-w-0">
        <h2 className="font-wenkai text-lg leading-snug text-foreground sm:text-xl">
          <Link
            to="/posts/$slug"
            params={{ slug: post.slug }}
            className={cn(
              'bg-[linear-gradient(var(--ink),var(--ink))] bg-no-repeat [background-position:0_100%] [background-size:0%_1px]',
              'transition-[background-size,color] duration-500 ease-out',
              'group-hover:text-ink group-hover:[background-size:100%_1px]',
              "after:absolute after:inset-0 after:content-['']",
            )}
          >
            {post.title}
          </Link>
        </h2>

        {post.summary && (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground sm:line-clamp-1">
            {post.summary}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
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
