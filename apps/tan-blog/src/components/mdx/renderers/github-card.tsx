'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BookMarkedIcon, GitForkIcon, ScaleIcon, StarIcon } from 'lucide-react'
import { SiGithub } from '@icons-pack/react-simple-icons'
import { m } from '#/paraglide/messages'
import { getLocale } from '#/paraglide/runtime'
import { orpc } from '@/lib/orpc'

export interface MdxGithubCardProps {
  href: string
  owner: string
  repo: string
  /** 手動覆寫 repo 描述 */
  description?: string
  /** 查不到 repo（404、API 額度用完）時改顯示的內容，通常是一般連結卡片 */
  fallback: React.ReactNode
}

// GitHub（linguist）的語言代表色：語言色是 GitHub 卡片的辨識資訊，只用在一顆小圓點上
const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572a5',
  Go: '#00add8',
  Rust: '#dea584',
  Java: '#b07219',
  Kotlin: '#a97bff',
  Swift: '#f05138',
  C: '#555555',
  'C++': '#f34b7d',
  'C#': '#178600',
  PHP: '#4f5d95',
  Ruby: '#701516',
  Dart: '#00b4ab',
  Vue: '#41b883',
  Svelte: '#ff3e00',
  Astro: '#ff5a03',
  HTML: '#e34c26',
  CSS: '#563d7c',
  SCSS: '#c6538c',
  Shell: '#89e051',
  Lua: '#000080',
  Elixir: '#6e4a7e',
  Zig: '#ec915c',
  MDX: '#fcb32c',
}

const compact = (n: number) =>
  new Intl.NumberFormat(getLocale(), { notation: 'compact', maximumFractionDigits: 1 }).format(n)

function relativeTime(iso: string) {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]
  const format = new Intl.RelativeTimeFormat(getLocale(), { numeric: 'auto' })
  for (const [unit, seconds] of units) {
    if (Math.abs(diff) >= seconds) return format.format(Math.round(diff / seconds), unit)
  }
  return format.format(0, 'minute')
}

/** 過去 52 週的 commit 長條（舊→新），高度依當年最大值縮放；沒有 commit 的週畫成一個小點 */
function Activity({ weeks }: { weeks: number[] }) {
  const max = Math.max(...weeks, 1)
  const total = weeks.reduce((a, b) => a + b, 0)
  return (
    <span className="mdx-gh-activity" title={`${m.github_activity()}：${total}`}>
      <span className="mdx-gh-activity-label">
        {m.github_activity()} · {compact(total)}
      </span>
      <span className="mdx-gh-bars" aria-hidden>
        {weeks.map((count, i) => (
          <span
            key={i}
            className="mdx-gh-bar"
            data-empty={count === 0 || undefined}
            style={{ '--h': `${Math.max((count / max) * 100, 8)}%` } as React.CSSProperties}
          />
        ))}
      </span>
    </span>
  )
}

/**
 * GitHub repo 卡片（LinkCard 遇到 github.com/owner/repo 自動切換），刻意跟一般連結卡片長得不一樣：
 * 像 GitHub 自己的 repo 卡——repo 圖示＋owner / repo＋公開徽章、右上角 owner 頭像、
 * topics、語言色點＋星星／fork／授權／更新時間，底下一排過去一年每週的 commit 長條。
 * 資料走 API 的 github.getRepo（伺服器端快取 6 小時，GITHUB_TOKEN 選填）；查不到就顯示 fallback。
 */
export function MdxGithubCard({ href, owner, repo, description, fallback }: MdxGithubCardProps) {
  const { data, isLoading, isError } = useQuery({
    ...orpc.github.getRepo.queryOptions({ input: { owner, repo } }),
    staleTime: 60 * 60 * 1000,
    retry: 1,
  })
  const [avatarFailed, setAvatarFailed] = useState(false)

  if (!isLoading && (isError || !data)) return <>{fallback}</>

  const [ownerName, repoName] = data?.fullName.split('/') ?? [owner, repo]
  const shownDescription = description ?? data?.description
  const languageColor = data?.language ? LANGUAGE_COLORS[data.language] : undefined

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="mdx-block mdx-gh not-prose">
      <span className="mdx-gh-body">
        <span className="mdx-gh-head">
          <BookMarkedIcon className="mdx-gh-icon" aria-hidden />
          <span className="mdx-gh-name">
            <span className="mdx-gh-owner">{ownerName}</span>
            <span className="mdx-gh-slash">/</span>
            <span className="mdx-gh-repo">{repoName}</span>
          </span>
          {data && (
            <span className="mdx-gh-pill" data-archived={data.archived || undefined}>
              {data.archived ? m.github_archived() : m.github_public()}
            </span>
          )}
        </span>

        {isLoading && !description ? (
          <span className="mdx-gh-desc">
            <span className="mdx-skeleton w-full" />
            <span className="mdx-skeleton w-3/5" />
          </span>
        ) : (
          <span className="mdx-gh-desc">{shownDescription}</span>
        )}

        {data && data.topics.length > 0 && (
          <span className="mdx-gh-topics">
            {data.topics.map((topic) => (
              <span key={topic} className="mdx-gh-topic">
                {topic}
              </span>
            ))}
          </span>
        )}

        <span className="mdx-gh-stats">
          {data?.language && (
            <span className="mdx-gh-stat">
              <span
                className="mdx-gh-lang"
                style={languageColor ? { background: languageColor } : undefined}
              />
              {data.language}
            </span>
          )}
          {data && (
            <>
              <span className="mdx-gh-stat" title={m.github_stars()}>
                <StarIcon aria-hidden />
                {compact(data.stars)}
              </span>
              <span className="mdx-gh-stat" title={m.github_forks()}>
                <GitForkIcon aria-hidden />
                {compact(data.forks)}
              </span>
            </>
          )}
          {data?.license && (
            <span className="mdx-gh-stat" title={m.github_license()}>
              <ScaleIcon aria-hidden />
              {data.license}
            </span>
          )}
          {data?.pushedAt && (
            <span className="mdx-gh-stat mdx-gh-updated" suppressHydrationWarning>
              {m.github_updated({ time: relativeTime(data.pushedAt) })}
            </span>
          )}
        </span>
      </span>

      <span className="mdx-gh-avatar">
        {data?.ownerAvatar && !avatarFailed ? (
          <img
            src={data.ownerAvatar}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setAvatarFailed(true)}
          />
        ) : (
          <SiGithub aria-hidden />
        )}
      </span>

      {data?.activity && <Activity weeks={data.activity} />}
    </a>
  )
}
