import { useEffect, useState } from 'react'
import { env } from '@sao-blog/env/tan-blog'
import {
  SEARCH_LOCALES,
  searchTypesenseDirect,
  type SearchHit,
  type SearchQuery,
  type SearchResult,
} from '@sao-blog/api/lib/search/query'
import { client } from '@/lib/orpc'
import type { ContentLocale } from '@/lib/content-locale'

// 全域 ⌘K 與文章頁共用的搜尋：同一個後端（Typesense），同一份結果

export type SearchResponse = SearchResult & { enabled: boolean }

// 有設定 search-only key 時瀏覽器直接查 Typesense（延遲最低），否則走 API proxy
export async function runSearch(
  query: SearchQuery,
  locale: ContentLocale,
  allLocales = false
): Promise<SearchResponse> {
  const url = env.VITE_TYPESENSE_URL
  const apiKey = env.VITE_TYPESENSE_SEARCH_KEY
  if (url && apiKey) {
    const locales = allLocales ? SEARCH_LOCALES : [locale]
    const results = await Promise.all(
      locales.map((l) => searchTypesenseDirect({ url, apiKey, locale: l }, query))
    )
    return {
      enabled: true,
      found: results.reduce((n, r) => n + r.found, 0),
      page: query.page ?? 1,
      hits: results.flatMap((r) => r.hits),
    }
  }
  const res = await client.content.search({ ...query, locale, allLocales })
  if (res.status !== 'success') throw new Error(res.message)
  return res.data
}

export function useDebounced<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

export const hitPath = (hit: SearchHit) =>
  hit.type === 'post' ? `/posts/${hit.slug}` : `/notes/${hit.slug}`
