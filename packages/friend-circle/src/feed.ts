import { XMLParser } from 'fast-xml-parser'

// 解析 RSS 2.0 / Atom / JSON Feed，統一成 FeedItem。
// 只取純文字：HTML 一律剝掉，不把對方的 HTML 帶進資料庫。

export interface FeedItem {
  title: string
  link: string
  publishedAt: string | null
  updatedAt: string | null
  /** 剝掉 HTML 後的內文或摘要（拿來做 feed 摘要與內容雜湊） */
  text: string
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  // 不展開外部實體；內建實體（&amp; 等）照常處理
  processEntities: true,
  htmlEntities: true,
})

type Node = unknown

const asArray = <T>(v: T | T[] | undefined | null): T[] => (v == null ? [] : Array.isArray(v) ? v : [v])

/** 節點的文字內容（可能是字串、{#text}、或 CDATA） */
function text(node: Node): string {
  if (node == null) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (typeof node === 'object' && '#text' in (node as Record<string, unknown>)) {
    return String((node as Record<string, unknown>)['#text'] ?? '')
  }
  return ''
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

export function stripHtml(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e: string) => {
      if (e[0] === '#') {
        const code = e[1]?.toLowerCase() === 'x' ? Number.parseInt(e.slice(2), 16) : Number(e.slice(1))
        return Number.isFinite(code) ? String.fromCodePoint(code) : m
      }
      return ENTITIES[e.toLowerCase()] ?? m
    })
    .replace(/\s+/g, ' ')
    .trim()
}

function toIso(value: string): string | null {
  if (!value) return null
  const d = new Date(value.trim())
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function resolve(link: string, base: string): string {
  try {
    return new URL(link.trim(), base).toString()
  } catch {
    return ''
  }
}

/** Atom 的 <link>：優先 rel="alternate"（或沒寫 rel）的 href */
function atomLink(links: Node): string {
  const list = asArray(links as Record<string, string> | Record<string, string>[])
  const alt = list.find((l) => !l['@_rel'] || l['@_rel'] === 'alternate') ?? list[0]
  return alt?.['@_href'] ?? text(alt)
}

export function parseFeed(body: string, feedUrl: string): FeedItem[] {
  const trimmed = body.trimStart()

  // JSON Feed
  if (trimmed.startsWith('{')) {
    const json = JSON.parse(trimmed) as { items?: Record<string, unknown>[] }
    return asArray(json.items).map((item) => ({
      title: stripHtml(String(item.title ?? '')),
      link: resolve(String(item.url ?? item.external_url ?? ''), feedUrl),
      publishedAt: toIso(String(item.date_published ?? '')),
      updatedAt: toIso(String(item.date_modified ?? '')),
      text: stripHtml(String(item.summary ?? item.content_text ?? item.content_html ?? '')),
    }))
  }

  const doc = parser.parse(body) as Record<string, any>

  // Atom
  if (doc.feed) {
    return asArray(doc.feed.entry).map((e: Record<string, Node>) => ({
      title: stripHtml(text(e.title)),
      link: resolve(atomLink(e.link), feedUrl),
      publishedAt: toIso(text(e.published)) ?? toIso(text(e.updated)),
      updatedAt: toIso(text(e.updated)),
      text: stripHtml(text(e.summary) || text(e.content)),
    }))
  }

  // RSS 2.0 / RSS 1.0 (RDF)
  const channel = doc.rss?.channel ?? doc['rdf:RDF']
  const items = asArray(channel?.item ?? doc['rdf:RDF']?.item)
  return items.map((i: Record<string, Node>) => ({
    title: stripHtml(text(i.title)),
    link: resolve(text(i.link) || text(i.guid), feedUrl),
    publishedAt: toIso(text(i.pubDate)) ?? toIso(text(i['dc:date'])),
    updatedAt: null,
    text: stripHtml(text(i.description) || text(i['content:encoded'])),
  }))
}

/** 從首頁 HTML 找 <link rel="alternate" type="application/rss+xml|atom+xml|feed+json"> */
export function discoverFeedLinks(html: string, pageUrl: string): string[] {
  const found: string[] = []
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const attr = (name: string) => tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, 'i'))?.[1] ?? ''
    if (!/\balternate\b/i.test(attr('rel'))) continue
    if (!/(rss|atom)\+xml|feed\+json/i.test(attr('type'))) continue
    const href = resolve(attr('href'), pageUrl)
    if (href) found.push(href)
  }
  return found
}
