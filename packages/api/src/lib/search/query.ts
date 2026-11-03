// 搜尋的共用定義：collection 名稱、查詢參數、回應解析。
// 這支不 import DB / env，tan-blog 的瀏覽器端（直接查 Typesense）與 API proxy 共用同一份。

export const SEARCH_LOCALES = ["zh-TW", "en", "ja"] as const;
export type SearchLocale = (typeof SEARCH_LOCALES)[number];
export type SearchContentType = "post" | "note";

/** 每語系一個 collection，前台 / API 一律查 alias（實體 collection 名稱帶時間戳，重建時切換） */
export const searchAlias = (locale: SearchLocale) => `contents_${locale}`;

/** Typesense 文件（一篇內容的一個語言版本） */
export interface SearchDocument {
  id: string; // `${type}:${refId}:${locale}`
  type: SearchContentType;
  refId: string;
  locale: SearchLocale;
  slug: string; // 文章為 slug；日記為 id
  title: string;
  summary?: string;
  content: string;
  headings?: string[];
  categoryId?: string;
  categoryName?: string;
  tags?: string[];
  topicId?: string;
  cover?: string;
  createdAt: number; // unix 秒
  updatedAt: number;
}

export interface SearchQuery {
  q: string;
  type?: SearchContentType;
  page?: number;
  perPage?: number;
}

export interface SearchHit {
  id: string;
  type: SearchContentType;
  refId: string;
  locale: SearchLocale;
  slug: string;
  title: string;
  summary: string | null;
  cover: string | null;
  categoryName: string | null;
  createdAt: number;
  /** 高亮片段，命中字詞以 <mark> 包住。其餘部分「未」escape，前端請用 splitHighlight 以文字渲染 */
  snippet: string | null;
  /** 標題高亮（同上） */
  titleHighlight: string | null;
}

export interface SearchResult {
  found: number;
  page: number;
  hits: SearchHit[];
}

/** 組 Typesense /documents/search 的參數 */
export function buildSearchParams(query: SearchQuery): Record<string, string> {
  const params: Record<string, string> = {
    q: query.q,
    query_by: "title,headings,summary,content",
    query_by_weights: "4,3,2,1",
    highlight_fields: "title,content",
    highlight_start_tag: "<mark>",
    highlight_end_tag: "</mark>",
    snippet_threshold: "30",
    highlight_affix_num_tokens: "12",
    // 內容全文很大，回傳時排除（highlight 不受影響）
    exclude_fields: "content",
    page: String(query.page ?? 1),
    per_page: String(query.perPage ?? 10),
  };
  if (query.type) params.filter_by = `type:=${query.type}`;
  return params;
}

type RawHighlight = { field: string; snippet?: string; snippets?: string[] };
type RawHit = { document: Partial<SearchDocument>; highlights?: RawHighlight[] };
export type RawSearchResponse = { found?: number; page?: number; hits?: RawHit[] };

export function parseSearchResponse(raw: RawSearchResponse): SearchResult {
  return {
    found: raw.found ?? 0,
    page: raw.page ?? 1,
    hits: (raw.hits ?? []).map(({ document: d, highlights = [] }) => {
      const hl = (field: string) => {
        const h = highlights.find((x) => x.field === field);
        return h?.snippet ?? h?.snippets?.[0] ?? null;
      };
      return {
        id: d.id ?? "",
        type: d.type ?? "post",
        refId: d.refId ?? "",
        locale: d.locale ?? "zh-TW",
        slug: d.slug ?? d.refId ?? "",
        title: d.title ?? "",
        summary: d.summary ?? null,
        cover: d.cover ?? null,
        categoryName: d.categoryName ?? null,
        createdAt: d.createdAt ?? 0,
        snippet: hl("content"),
        titleHighlight: hl("title"),
      };
    }),
  };
}

/** 把高亮字串切成 [文字, 是否命中] 片段，讓前端不必用 dangerouslySetInnerHTML */
export function splitHighlight(text: string): Array<{ text: string; mark: boolean }> {
  return text
    .split(/(<mark>[\s\S]*?<\/mark>)/)
    .filter(Boolean)
    .map((part) =>
      part.startsWith("<mark>") && part.endsWith("</mark>")
        ? { text: part.slice(6, -7), mark: true }
        : { text: part, mark: false },
    );
}

/** 瀏覽器直接查 Typesense（search-only key） */
export async function searchTypesenseDirect(
  opts: { url: string; apiKey: string; locale: SearchLocale; fetch?: typeof fetch },
  query: SearchQuery,
): Promise<SearchResult> {
  const qs = new URLSearchParams(buildSearchParams(query));
  const base = opts.url.replace(/\/+$/, "");
  const res = await (opts.fetch ?? fetch)(
    `${base}/collections/${encodeURIComponent(searchAlias(opts.locale))}/documents/search?${qs}`,
    { headers: { "X-TYPESENSE-API-KEY": opts.apiKey } },
  );
  if (!res.ok) throw new Error(`Typesense search failed: ${res.status}`);
  return parseSearchResponse((await res.json()) as RawSearchResponse);
}
