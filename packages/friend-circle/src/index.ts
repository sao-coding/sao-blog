import { createHash } from 'node:crypto'
import { discoverFeedLinks, parseFeed, type FeedItem } from './feed'
import { applyAiSummaries } from './summarize'

// 朋友圈聚合器：讀友鏈 → 抓各站 feed → 整理成文章 → 寫回自己的後端。
// 由 GitHub Action 定時執行，也可以在本機跑：
//   FC_API_URL=http://localhost:3000 FC_API_KEY=... bun run src/index.ts
//
// 環境變數
//   FC_API_URL          後端網址（必填）
//   FC_API_KEY          後台建立的 API Key（必填，帳號需為管理員）
//   FC_KEEP_PER_FRIEND  每個站保留幾篇（預設 10）
//   FC_CONCURRENCY      同時抓幾個站（預設 5）
//   FC_DRY_RUN=1        只抓不寫回，印出結果

const API_URL = required('FC_API_URL').replace(/\/+$/, '')
const API_KEY = required('FC_API_KEY')
const KEEP = intEnv('FC_KEEP_PER_FRIEND', 10)
const CONCURRENCY = intEnv('FC_CONCURRENCY', 5)
const DRY_RUN = process.env.FC_DRY_RUN === '1'

const USER_AGENT = `sao-blog-friend-circle/1.0 (+${API_URL}/friends.json)`
const TIMEOUT_MS = 15_000
const MAX_BYTES = 5 * 1024 * 1024
const SUMMARY_CHARS = 160
// 首頁沒有 <link rel="alternate"> 時依序嘗試
const FALLBACK_PATHS = ['/atom.xml', '/feed', '/rss.xml', '/feed.xml', '/index.xml', '/rss', '/feed.json']

interface Source {
  id: string
  name: string
  url: string
  feedUrl: string | null
  etag: string | null
  lastModified: string | null
}

interface Cached {
  link: string
  contentHash: string | null
  summarySource: 'ai' | 'feed' | 'manual' | 'none'
}

interface Result {
  id: string
  fetchStatus: 'ok' | 'error' | 'not_modified'
  fetchError: string | null
  etag: string | null
  lastModified: string | null
  discoveredFeedUrl: string | null
}

interface Article {
  friendId: string
  link: string
  title: string
  publishedAt: string | null
  updatedAt: string | null
  summary: string | null
  summarySource: 'ai' | 'feed' | 'none'
  summaryModel: string | null
  contentHash: string | null
}

/** 爬取階段的文章：多帶內文與是否需要摘要，寫回前會拿掉 */
type CrawledArticle = Article & { text: string; needsSummary: boolean }

function required(name: string): string {
  const v = process.env[name]
  if (!v) {
    console.error(`缺少環境變數 ${name}`)
    process.exit(1)
  }
  return v
}

function intEnv(name: string, fallback: number): number {
  const n = Number(process.env[name])
  return Number.isInteger(n) && n > 0 ? n : fallback
}

async function api<T>(method: 'GET' | 'PUT', path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_URL}/api${path}`, {
    method,
    headers: { 'x-api-key': API_KEY, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  })
  if (!res.ok) throw new Error(`${method} ${path} → HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`)
  return (await res.json()) as T
}

/** 抓網頁 / feed：逾時、大小上限、只收 http(s) */
async function get(url: string, headers: Record<string, string> = {}) {
  const protocol = new URL(url).protocol
  if (protocol !== 'http:' && protocol !== 'https:') throw new Error(`不支援的網址：${url}`)
  const res = await fetch(url, {
    headers: { 'user-agent': USER_AGENT, accept: 'application/rss+xml, application/atom+xml, application/feed+json, application/xml, text/xml, text/html;q=0.8, */*;q=0.5', ...headers },
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  const length = Number(res.headers.get('content-length'))
  if (length > MAX_BYTES) throw new Error(`回應太大（${length} bytes）`)
  const body = res.status === 304 ? '' : await res.text()
  if (body.length > MAX_BYTES) throw new Error('回應太大')
  return { res, body }
}

const looksLikeFeed = (body: string) => /^\s*(<\?xml|<rss|<feed|<rdf:RDF|\{)/i.test(body) && !/^\s*<!doctype html/i.test(body)

/** 沒填 feed 網址：先看首頁的 <link rel="alternate">，再試常見路徑 */
async function discoverFeed(siteUrl: string): Promise<string | null> {
  try {
    const { res, body } = await get(siteUrl)
    if (res.ok) {
      const links = discoverFeedLinks(body, res.url || siteUrl)
      if (links[0]) return links[0]
    }
  } catch {
    // 首頁抓不到就繼續試常見路徑
  }
  for (const path of FALLBACK_PATHS) {
    const candidate = new URL(path, siteUrl).toString()
    try {
      const { res, body } = await get(candidate)
      if (res.ok && looksLikeFeed(body)) return candidate
    } catch {
      // 下一個
    }
  }
  return null
}

const hash = (s: string) => createHash('sha256').update(s).digest('hex')

function summarize(text: string): string | null {
  if (!text) return null
  return text.length > SUMMARY_CHARS ? `${text.slice(0, SUMMARY_CHARS).trimEnd()}…` : text
}

function toArticle(source: Source, item: FeedItem, cached: Map<string, Cached>): CrawledArticle | null {
  if (!item.title || !item.link) return null
  const contentHash = hash(`${item.title}\n${item.text}`)
  const prev = cached.get(item.link)
  // 已經有 AI 或手動摘要、而且內容沒變：不送摘要，後端會保留原本的
  const keepPrev = prev && (prev.summarySource === 'ai' || prev.summarySource === 'manual') && prev.contentHash === contentHash
  const summary = keepPrev ? null : summarize(item.text)
  return {
    friendId: source.id,
    link: item.link,
    title: item.title.slice(0, 300),
    publishedAt: item.publishedAt,
    updatedAt: item.updatedAt,
    summary,
    summarySource: summary ? 'feed' : 'none',
    summaryModel: null,
    contentHash,
    text: item.text,
    needsSummary: !keepPrev,
  }
}

const byDateDesc = (a: FeedItem, b: FeedItem) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '')

async function crawl(source: Source, cached: Map<string, Cached>): Promise<{ result: Result; articles: CrawledArticle[] }> {
  const base: Result = {
    id: source.id,
    fetchStatus: 'error',
    fetchError: null,
    etag: source.etag,
    lastModified: source.lastModified,
    discoveredFeedUrl: null,
  }
  try {
    let feedUrl = source.feedUrl
    if (!feedUrl) {
      feedUrl = await discoverFeed(source.url)
      if (!feedUrl) return { result: { ...base, fetchError: '找不到 RSS / Atom feed' }, articles: [] }
      base.discoveredFeedUrl = feedUrl
    }

    // 有填 feed 時才用條件請求；剛發現的 feed 第一次一定完整抓
    const conditional: Record<string, string> = {}
    if (source.feedUrl && source.etag) conditional['if-none-match'] = source.etag
    if (source.feedUrl && source.lastModified) conditional['if-modified-since'] = source.lastModified

    const { res, body } = await get(feedUrl, conditional)
    if (res.status === 304) return { result: { ...base, fetchStatus: 'not_modified' }, articles: [] }
    if (!res.ok) return { result: { ...base, fetchError: `HTTP ${res.status}` }, articles: [] }

    const items = parseFeed(body, res.url || feedUrl).sort(byDateDesc).slice(0, KEEP)
    const seen = new Set<string>()
    const articles: CrawledArticle[] = []
    for (const item of items) {
      if (seen.has(item.link)) continue
      seen.add(item.link)
      const article = toArticle(source, item, cached)
      if (article) articles.push(article)
    }
    return {
      result: {
        ...base,
        fetchStatus: 'ok',
        etag: res.headers.get('etag'),
        lastModified: res.headers.get('last-modified'),
      },
      articles,
    }
  } catch (err) {
    return { result: { ...base, fetchError: err instanceof Error ? err.message : String(err) }, articles: [] }
  }
}

/** 限制同時進行的數量 */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i]!)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return out
}

async function main() {
  const { data } = await api<{ data: { sources: Source[]; cached: Cached[] } }>('GET', '/admin/friend-circle/sources')
  const cached = new Map(data.cached.map((c) => [c.link, c]))
  console.log(`要抓 ${data.sources.length} 個站`)

  const crawled = await mapLimit(data.sources, CONCURRENCY, async (source) => {
    const r = await crawl(source, cached)
    const status = r.result.fetchStatus === 'error' ? `✗ ${r.result.fetchError}` : r.result.fetchStatus === 'not_modified' ? '— 沒有更新' : `✓ ${r.articles.length} 篇`
    console.log(`${source.name} (${source.url}) ${status}`)
    return r
  })

  const results = crawled.map((c) => c.result)
  const crawledArticles = crawled.flatMap((c) => c.articles)
  const aiCalls = await applyAiSummaries(crawledArticles)
  if (aiCalls > 0) console.log(`AI 摘要 ${aiCalls} 篇`)
  const articles: Article[] = crawledArticles.map(({ text: _text, needsSummary: _needs, ...a }) => a)
  const failed = results.filter((r) => r.fetchStatus === 'error').length

  if (DRY_RUN) {
    console.log(JSON.stringify({ results, articles }, null, 2))
    return
  }

  const res = await api<{ message: string }>('PUT', '/admin/friend-circle/ingest', {
    results,
    articles,
    keepPerFriend: KEEP,
  })
  console.log(res.message)
  // 有站失敗不算整體失敗（保留上次的資料）；全部失敗才讓 Action 變紅
  if (data.sources.length > 0 && failed === data.sources.length) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
