import { Link } from '@tanstack/react-router'
import type z from 'zod'
import type { postSchema } from '@sao-blog/api/schema/post'
import { m } from '#/paraglide/messages'
import { TermMark } from '@/components/written-season'
import type { SearchHit } from '@sao-blog/api/lib/search/query'
import { Highlighted, SearchSnippet } from '@/components/search/search-hit'
import { siteTime } from '@/lib/site-time'
import { anchorProps } from '@/lib/page-transition'
import { ListRow, metaLinkClass, rowLinkClass } from '@/components/layout/list-parts'

export type PostListItem = z.infer<typeof postSchema>

const MAX_VISIBLE_TAGS = 2

// 文章列表的一列：左邊月日與節氣，右邊標題、一行摘要、分類與標籤（components/layout/list-parts.tsx）
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
    <ListRow
      writtenAt={post[dateKey]}
      date={
        pinned ? (
          <span className="font-display text-zhu">{m.posts_pinned()}</span>
        ) : (
          <>
            <time dateTime={date.toISOString()} className="block">{date.format('MM.DD')}</time>
            {/* 寫作當時的節氣 */}
            <TermMark date={post[dateKey]} className="mt-1 block" />
          </>
        )
      }
      title={
        // 錨字：標題與文章頁的 h1 共用 view-transition-name（lib/page-transition.ts 的 anchorProps）
        <Link to="/posts/$slug" params={{ slug: post.slug }} className={rowLinkClass}>
          <span {...anchorProps(`/posts/${post.slug}`)}>
            {hit?.titleHighlight ? <Highlighted text={hit.titleHighlight} /> : post.title}
          </span>
        </Link>
      }
      summary={hit?.snippet ? <SearchSnippet hit={hit} /> : post.summary}
      meta={
        <>
          <Link to="/categories/$slug" params={{ slug: post.category.slug }} className={metaLinkClass}>
            {post.category.name}
          </Link>
          {post.tags.slice(0, MAX_VISIBLE_TAGS).map((tag) => (
            <Link
              key={tag.id}
              to="/posts"
              search={(prev) => ({ ...prev, tag: tag.slug })}
              resetScroll={false}
              className={metaLinkClass}
            >
              #{tag.name}
            </Link>
          ))}
          {extraTags > 0 && <span>+{extraTags}</span>}
          <span className="ml-auto tabular-nums">
            <span title={m.posts_views({ count: String(post.viewCount) })}>{m.posts_views_short({ count: String(post.viewCount) })}</span>
            <span className="mx-1.5">·</span>
            <span title={m.posts_comments({ count: String(post.commentCount) })}>{m.posts_comments_short({ count: String(post.commentCount) })}</span>
          </span>
        </>
      }
    />
  )
}
