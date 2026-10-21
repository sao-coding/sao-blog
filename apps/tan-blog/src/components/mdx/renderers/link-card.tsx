'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRightIcon, GitForkIcon, ScaleIcon, StarIcon } from 'lucide-react'
import { SiGithub } from '@icons-pack/react-simple-icons'
import { m } from '#/paraglide/messages'
import { getLocale } from '#/paraglide/runtime'
import { orpc } from '@/lib/orpc'

export interface MdxLinkCardProps {
  href: string
  /** 手動指定標題，省略時用網頁的 og:title */
  title?: string
  /** 手動指定描述，省略時用網頁的 og:description */
  description?: string
}

interface ParsedUrl {
  host: string
  /** 網址路徑拆成的段落，例如 ['TanStack', 'router'] */
  segments: string[]
}

function parseUrl(href: string): ParsedUrl {
  try {
    const url = new URL(href)
    const segments = url.pathname
      .split('/')
      .filter(Boolean)
      .map((s) => {
        try {
          return decodeURIComponent(s)
        } catch {
          return s
        }
      })
    return { host: url.hostname.replace(/^www\./, ''), segments }
  } catch {
    return { host: href, segments: [] }
  }
}

// 沒有 og 資料時的標題：GitHub 用 owner/repo，其他網站用網域
const fallbackTitle = ({ host, segments }: ParsedUrl) =>
  host === 'github.com' && segments.length >= 2 ? `${segments[0]}/${segments[1]}` : host

// 題簽已經寫了網站名，標題裡「GitHub - …」「… | MDN」這種重複的前後綴拿掉
function stripSiteName(title: string, siteName: string | null | undefined) {
  if (!siteName) return title
  const escaped = siteName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const stripped = title
    .replace(new RegExp(`^${escaped}\\s*[-|·:–—]\\s*`, 'i'), '')
    .replace(new RegExp(`\\s*[-|·–—]\\s*${escaped}$`, 'i'), '')
  return stripped || title
}

/** 外站圖片載入失敗就隱藏（換成印章），不留破圖 */
function RemoteImage({ src, className, onFail }: { src: string; className?: string; onFail?: () => void }) {
  const [failed, setFailed] = useState(false)
  if (failed) return null
  return (
    <img
      src={src}
      alt=""
      className={className}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => {
        setFailed(true)
        onFail?.()
      }}
    />
  )
}

/**
 * 連結卡片，樣子是一張「票根」：
 * - 左邊主聯：網站（圖示＋名稱）→ 標題（文楷）→ 描述 → 網址麵包屑
 * - 右邊存根：有預覽圖放預覽圖；沒有就蓋一枚印——網站圖示，或網域第一個字的朱色方印
 * - 主聯與存根之間一道虛線撕線，上下各打一個半圓缺口
 * 資料來自 linkPreview API；SSR 先輸出網址版本（標題用網域或 GitHub 的 owner/repo），
 * client 抓到後補上。抓不到 og 資料的網站也不會只剩一行網域。
 *
 * ```mdx
 * <LinkCard href="https://tanstack.com/start/latest" />
 * ```
 */
export const MdxLinkCard = (props: MdxLinkCardProps) => {
  const repo = githubRepoOf(props.href)
  return repo ? <GithubRepoCard {...props} {...repo} /> : <GenericLinkCard {...props} />
}

// github.com/owner/repo（可帶 .git 或結尾斜線）才當成 repo；issue、PR、個人頁走一般卡片
const GITHUB_RESERVED = new Set(['orgs', 'topics', 'sponsors', 'settings', 'marketplace', 'features', 'collections', 'explore'])
function githubRepoOf(href: string): { owner: string; repo: string } | null {
  const { host, segments } = parseUrl(href)
  if (host !== 'github.com' || segments.length !== 2 || GITHUB_RESERVED.has(segments[0])) return null
  return { owner: segments[0], repo: segments[1].replace(/\.git$/, '') }
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

/**
 * GitHub repo 卡片（LinkCard 遇到 github.com/owner/repo 自動切換）：同一張票根，
 * 主聯是 owner / repo、描述、topics 與語言／授權／更新時間；存根印上星星數，像票號。
 * 資料走 API 的 github.getRepo（伺服器端快取 6 小時，可選 GITHUB_TOKEN）；查不到就退回一般卡片。
 */
function GithubRepoCard({ href, title, description, owner, repo }: MdxLinkCardProps & { owner: string; repo: string }) {
  const { data, isLoading, isError } = useQuery({
    ...orpc.github.getRepo.queryOptions({ input: { owner, repo } }),
    staleTime: 60 * 60 * 1000,
    retry: 1,
  })

  if (!isLoading && (isError || !data)) {
    return <GenericLinkCard href={href} title={title} description={description} />
  }

  const [ownerName, repoName] = data?.fullName.split('/') ?? [owner, repo]
  const shownDescription = description ?? data?.description

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="mdx-block mdx-linkcard mdx-github not-prose"
    >
      <span className="mdx-linkcard-main">
        <span className="mdx-github-name">
          {data?.ownerAvatar ? (
            <RemoteImage src={data.ownerAvatar} className="mdx-github-avatar" />
          ) : (
            <SiGithub className="mdx-github-avatar" aria-hidden />
          )}
          <span className="truncate">
            <span className="mdx-github-owner">{ownerName}</span>
            <span className="mdx-linkcard-sep">/</span>
            <span className="mdx-github-repo">{title ?? repoName}</span>
          </span>
          {data?.archived && <span className="mdx-github-badge">{m.github_archived()}</span>}
        </span>
        {isLoading && !description ? (
          <span className="mdx-linkcard-desc">
            <span className="mdx-skeleton w-full" />
            <span className="mdx-skeleton w-3/5" />
          </span>
        ) : (
          shownDescription && <span className="mdx-linkcard-desc">{shownDescription}</span>
        )}
        {data && data.topics.length > 0 && (
          <span className="mdx-github-topics">
            {data.topics.slice(0, 4).map((topic) => (
              <span key={topic} className="mdx-github-topic">
                {topic}
              </span>
            ))}
          </span>
        )}
        <span className="mdx-linkcard-path mdx-github-meta">
          {data?.language && (
            <span className="mdx-github-stat">
              <span className="mdx-github-dot" />
              {data.language}
            </span>
          )}
          {data && (
            <span className="mdx-github-stat">
              <GitForkIcon aria-hidden />
              {compact(data.forks)}
            </span>
          )}
          {data?.license && (
            <span className="mdx-github-stat">
              <ScaleIcon aria-hidden />
              {data.license}
            </span>
          )}
          {data?.pushedAt && (
            <span className="mdx-github-stat mdx-github-updated" suppressHydrationWarning>
              {m.github_updated({ time: relativeTime(data.pushedAt) })}
            </span>
          )}
          <ArrowUpRightIcon className="mdx-linkcard-arrow" aria-hidden />
        </span>
      </span>
      <span className="mdx-linkcard-stub mdx-github-stub">
        <SiGithub className="mdx-github-mark" aria-hidden />
        <StarIcon className="mdx-github-star" aria-hidden />
        <span className="mdx-github-stars">
          {data ? compact(data.stars) : <span className="mdx-skeleton w-10" />}
        </span>
        <span className="mdx-github-stars-label">{m.github_stars()}</span>
      </span>
    </a>
  )
}

function GenericLinkCard({ href, title, description }: MdxLinkCardProps) {
  const { data, isLoading } = useQuery({
    ...orpc.linkPreview.getLinkPreview.queryOptions({ input: { url: href } }),
    staleTime: 24 * 60 * 60 * 1000,
    retry: 1,
  })
  const [imageFailed, setImageFailed] = useState(false)

  const url = parseUrl(href)
  const isGithub = url.host === 'github.com'
  const shownTitle =
    title ?? (data?.title ? stripSiteName(data.title, data.siteName) : fallbackTitle(url))
  const shownDescription = description ?? data?.description
  const siteName = data?.siteName ?? (isGithub ? 'GitHub' : url.host)
  const image = data?.image && !imageFailed ? data.image : undefined
  const loading = isLoading && !title

  const seal = data?.favicon ? (
    <RemoteImage src={data.favicon} className="mdx-linkcard-favicon" />
  ) : isGithub ? (
    <SiGithub className="mdx-linkcard-favicon" aria-hidden />
  ) : null

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="mdx-block mdx-linkcard not-prose"
      data-has-image={image ? '' : undefined}
    >
      <span className="mdx-linkcard-main">
        <span className="mdx-linkcard-site">
          {seal ?? <span className="mdx-linkcard-initial">{url.host[0]?.toUpperCase()}</span>}
          <span className="truncate">{siteName}</span>
        </span>
        <span className="mdx-linkcard-title">
          {loading ? <span className="mdx-skeleton w-2/3" /> : shownTitle}
        </span>
        {loading && !description ? (
          <span className="mdx-linkcard-desc">
            <span className="mdx-skeleton w-full" />
            <span className="mdx-skeleton w-4/5" />
          </span>
        ) : (
          shownDescription && <span className="mdx-linkcard-desc">{shownDescription}</span>
        )}
        <span className="mdx-linkcard-path">
          <span className="truncate">
            {url.host}
            {url.segments.map((segment, i) => (
              <span key={i}>
                <span className="mdx-linkcard-sep">/</span>
                {segment}
              </span>
            ))}
          </span>
          <ArrowUpRightIcon className="mdx-linkcard-arrow" aria-hidden />
        </span>
      </span>
      <span className="mdx-linkcard-stub" aria-hidden>
        {image ? (
          <>
            <RemoteImage src={image} className="mdx-linkcard-backdrop" />
            <RemoteImage src={image} className="mdx-linkcard-image" onFail={() => setImageFailed(true)} />
          </>
        ) : (
          <span className="mdx-linkcard-seal">
            {seal ?? <span className="mdx-linkcard-seal-letter">{url.host[0]?.toUpperCase()}</span>}
          </span>
        )}
      </span>
    </a>
  )
}
