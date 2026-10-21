'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRightIcon } from 'lucide-react'
import { SiGithub } from '@icons-pack/react-simple-icons'
import { orpc } from '@/lib/orpc'
import { MdxGithubCard } from './github-card'
import { TweetCard } from './tweet-card'

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
  const tweetId = tweetIdOf(props.href)
  if (tweetId) return <TweetCard id={tweetId} fallback={<GenericLinkCard {...props} />} />
  const repo = githubRepoOf(props.href)
  return repo ? <MdxGithubCard {...props} {...repo} /> : <GenericLinkCard {...props} />
}

/**
 * 嵌入推文：`<Tweet id="20" />`。抓不到時退回指向該推文的一般連結卡片。
 * 寫在這裡（不是 tweet-card.tsx）是為了拿得到 GenericLinkCard，又不讓兩支檔案互相 import。
 */
export const MdxTweet = ({ id }: { id: string }) => (
  <TweetCard id={id} fallback={<GenericLinkCard href={`https://x.com/i/status/${id}`} />} />
)

// x.com／twitter.com 的 /{帳號}/status/{id} 是推文
function tweetIdOf(href: string): string | null {
  return href.match(/^https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/[^/]+\/status\/(\d+)/)?.[1] ?? null
}

// github.com/owner/repo（可帶 .git 或結尾斜線）才當成 repo；issue、PR、個人頁走一般卡片
const GITHUB_RESERVED = new Set(['orgs', 'topics', 'sponsors', 'settings', 'marketplace', 'features', 'collections', 'explore'])
function githubRepoOf(href: string): { owner: string; repo: string } | null {
  const { host, segments } = parseUrl(href)
  if (host !== 'github.com' || segments.length !== 2 || GITHUB_RESERVED.has(segments[0])) return null
  return { owner: segments[0], repo: segments[1].replace(/\.git$/, '') }
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
