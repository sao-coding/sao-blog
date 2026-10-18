import { Link } from '@tanstack/react-router'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import { EyeIcon, MessageCircleIcon } from 'lucide-react'
import type z from 'zod'
import type { postSchema } from '@sao-blog/api/schema/post'
import { dayjsLocale } from '@/lib/date-locale'
import { cn } from '@/lib/utils'
import { m } from '#/paraglide/messages'

dayjs.extend(relativeTime)
dayjs.extend(localizedFormat)

export type PostListItem = z.infer<typeof postSchema>

const MAX_VISIBLE_TAGS = 2

// 30 天內顯示相對時間（「9 天前」），更早的顯示完整日期＋星期
function formatPostDate(date: Date) {
  const d = dayjs(date).locale(dayjsLocale())
  return dayjs().diff(d, 'day') < 30 ? d.fromNow() : d.format('LL dddd')
}

// 標題用 Link 的 ::after 撐滿整列當點擊區；分類/標籤連結用 relative z-10
// 疊在上層，避免 <a> 巢狀 <a> 的非法 HTML。
export function PostItem({
  post,
  variant = 'row',
}: {
  post: PostListItem
  variant?: 'row' | 'pinned'
}) {
  const extraTags = post.tags.length - MAX_VISIBLE_TAGS

  return (
    <article
      className={cn(
        'group relative',
        variant === 'pinned'
          ? 'rounded-xl border bg-card/60 p-5 backdrop-blur-sm transition-colors hover:border-primary/40'
          : 'rounded-lg px-3 py-4 -mx-3 transition-colors hover:bg-accent/40',
      )}
    >
      {variant === 'pinned' && (
        <span className="mb-2 inline-block text-xs font-medium text-primary">{m.posts_pinned()}</span>
      )}
      <h2 className="text-base font-semibold leading-snug text-foreground sm:text-lg">
        <Link
          to="/posts/$slug"
          params={{ slug: post.slug }}
          className="transition-colors after:absolute after:inset-0 after:content-[''] group-hover:text-primary"
        >
          {post.title}
        </Link>
      </h2>

      {post.summary && (
        <p
          className={cn(
            'mt-1.5 text-sm text-muted-foreground',
            variant === 'pinned' ? 'line-clamp-2' : 'line-clamp-1',
          )}
        >
          {post.summary}
        </p>
      )}

      <div className="mt-2 flex items-center justify-between gap-4 text-xs text-muted-foreground">
        <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
          <time dateTime={new Date(post.createdAt).toISOString()} suppressHydrationWarning>
            {formatPostDate(post.createdAt)}
          </time>
          <span aria-hidden>·</span>
          <Link
            to="/categories/$slug"
            params={{ slug: post.category.slug }}
            className="relative z-10 font-medium text-foreground/80 hover:text-primary"
          >
            {post.category.name}
          </Link>
          {post.tags.length > 0 && <span aria-hidden>/</span>}
          {post.tags.slice(0, MAX_VISIBLE_TAGS).map((tag, i) => (
            <span key={tag.id} className="inline-flex items-center">
              <Link
                to="/posts"
                search={(prev) => ({ ...prev, tag: tag.slug })}
                className="relative z-10 hover:text-primary"
              >
                {tag.name}
              </Link>
              {i < Math.min(post.tags.length, MAX_VISIBLE_TAGS) - 1 && <span>,</span>}
            </span>
          ))}
          {extraTags > 0 && <span>+{extraTags}</span>}
        </div>

        <div className="flex shrink-0 items-center gap-3 tabular-nums">
          <span className="inline-flex items-center gap-1" title={m.posts_views({ count: String(post.viewCount) })}>
            <EyeIcon className="size-3.5" />
            {post.viewCount}
          </span>
          <span
            className="inline-flex items-center gap-1"
            title={m.posts_comments({ count: String(post.commentCount) })}
          >
            <MessageCircleIcon className="size-3.5" />
            {post.commentCount}
          </span>
        </div>
      </div>
    </article>
  )
}
