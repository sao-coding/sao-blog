'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRightIcon, BadgeCheckIcon, HeartIcon, MessageCircleIcon, PlayIcon } from 'lucide-react'
import { SiX } from '@icons-pack/react-simple-icons'
import { m } from '#/paraglide/messages'
import { getLocale } from '#/paraglide/runtime'
import { orpc } from '@/lib/orpc'

export interface TweetCardProps {
  id: string
  /** 推文抓不到（刪除、私人帳號、端點失敗）時改顯示的內容 */
  fallback: React.ReactNode
}

const compact = (n: number) =>
  new Intl.NumberFormat(getLocale(), { notation: 'compact', maximumFractionDigits: 1 }).format(n)

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat(getLocale(), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))

/**
 * 推文卡片，樣子是一張明信片：右上角貼一枚有齒孔的郵票（X 標誌），
 * 內文用文楷像寫在卡片上；照片／影片封面排成格狀，影片點了到 X 上看。
 * 資料走 API 的 tweet.getTweet（伺服器端向 X 的嵌入用端點抓，快取 24 小時）；
 * 抓不到就顯示 fallback（一般連結卡片）。
 */
export function TweetCard({ id, fallback }: TweetCardProps) {
  const { data, isLoading, isError } = useQuery({
    ...orpc.tweet.getTweet.queryOptions({ input: { id } }),
    staleTime: 60 * 60 * 1000,
    retry: 1,
  })
  const [avatarFailed, setAvatarFailed] = useState(false)

  if (!isLoading && (isError || !data)) return <>{fallback}</>

  return (
    <figure className="mdx-block mdx-tweet not-prose" data-loading={isLoading || undefined}>
      <a
        href={data?.url ?? `https://x.com/i/status/${id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mdx-tweet-stamp"
        aria-label={m.tweet_view()}
      >
        <SiX aria-hidden />
      </a>

      <header className="mdx-tweet-head">
        <span className="mdx-tweet-avatar">
          {data?.author.avatar && !avatarFailed && (
            <img
              src={data.author.avatar}
              alt=""
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setAvatarFailed(true)}
            />
          )}
        </span>
        <span className="mdx-tweet-who">
          {data ? (
            <>
              <a
                href={`https://x.com/${data.author.handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mdx-tweet-name"
              >
                {data.author.name}
                {data.author.verified && <BadgeCheckIcon className="mdx-tweet-verified" aria-hidden />}
              </a>
              <span className="mdx-tweet-handle">@{data.author.handle}</span>
            </>
          ) : (
            <>
              <span className="mdx-skeleton w-28" />
              <span className="mdx-skeleton w-20" />
            </>
          )}
        </span>
      </header>

      <blockquote className="mdx-tweet-text">
        {data ? (
          data.segments.map((seg, i) =>
            seg.type === 'text' ? (
              <React.Fragment key={i}>{seg.text}</React.Fragment>
            ) : (
              <a key={i} href={seg.href} target="_blank" rel="noopener noreferrer">
                {seg.text}
              </a>
            )
          )
        ) : (
          <>
            <span className="mdx-skeleton w-full" />
            <span className="mdx-skeleton w-4/5" />
          </>
        )}
      </blockquote>

      {data && data.media.length > 0 && (
        <div className="mdx-tweet-media" data-count={data.media.length}>
          {data.media.map((media, i) => (
            <a
              key={i}
              href={data.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mdx-tweet-photo"
              style={
                data.media.length === 1
                  ? ({ '--ratio': `${media.width} / ${media.height}` } as React.CSSProperties)
                  : undefined
              }
              aria-label={media.type === 'video' ? m.tweet_video() : undefined}
            >
              <img src={media.url} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
              {media.type === 'video' && (
                <span className="mdx-tweet-play">
                  <PlayIcon aria-hidden />
                </span>
              )}
            </a>
          ))}
        </div>
      )}

      <footer className="mdx-tweet-foot">
        {data && (
          <>
            <time dateTime={data.createdAt} suppressHydrationWarning>
              {formatDate(data.createdAt)}
            </time>
            <span className="mdx-tweet-stat" title={m.tweet_likes()}>
              <HeartIcon aria-hidden />
              {compact(data.likes)}
            </span>
            <span className="mdx-tweet-stat" title={m.tweet_replies()}>
              <MessageCircleIcon aria-hidden />
              {compact(data.replies)}
            </span>
            <a href={data.url} target="_blank" rel="noopener noreferrer" className="mdx-tweet-open">
              {m.tweet_view()}
              <ArrowUpRightIcon aria-hidden />
            </a>
          </>
        )}
      </footer>
    </figure>
  )
}
