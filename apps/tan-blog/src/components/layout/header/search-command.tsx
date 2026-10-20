import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { SearchIcon } from 'lucide-react'
import { env } from '@sao-blog/env/tan-blog'
import {
  SEARCH_LOCALES,
  searchTypesenseDirect,
  splitHighlight,
  type SearchHit,
  type SearchQuery,
  type SearchResult,
} from '@sao-blog/api/lib/search/query'
import { localizeHref } from '#/paraglide/runtime'
import { m } from '#/paraglide/messages'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@sao-blog/ui/components/command'
import { Button } from '@sao-blog/ui/components/button'
import { client } from '@/lib/orpc'
import {
  currentContentLocale,
  toUiLocale,
  type ContentLocale,
} from '@/lib/content-locale'
import { LOCALE_LABELS } from '@/components/locale-switcher'

type SearchResponse = SearchResult & { enabled: boolean }

// 有設定 search-only key 時瀏覽器直接查 Typesense（延遲最低），否則走 API proxy
async function runSearch(
  query: SearchQuery,
  locale: ContentLocale,
  allLocales: boolean
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

function useDebounced<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

function Highlighted({ text }: { text: string }) {
  return (
    <>
      {splitHighlight(text).map((part, i) =>
        part.mark ? (
          <mark key={i} className="rounded-sm bg-primary/20 px-0.5 text-foreground">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </>
  )
}

const hitPath = (hit: SearchHit) =>
  hit.type === 'post' ? `/posts/${hit.slug}` : `/notes/${hit.slug}`

export function SearchCommand() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [allLocales, setAllLocales] = useState(false)
  const q = useDebounced(input.trim())
  const locale = currentContentLocale()
  const navigate = useNavigate()

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const { data, isFetching, isError } = useQuery({
    queryKey: ['content-search', q, locale, allLocales],
    queryFn: () => runSearch({ q, perPage: 10 }, locale, allLocales),
    enabled: open && q.length > 0,
    staleTime: 30_000,
  })

  const select = (hit: SearchHit) => {
    setOpen(false)
    if (hit.locale === locale) {
      navigate({ to: hitPath(hit) })
    } else {
      window.location.assign(localizeHref(hitPath(hit), { locale: toUiLocale(hit.locale) }))
    }
  }

  const posts = data?.hits.filter((h) => h.type === 'post') ?? []
  const notes = data?.hits.filter((h) => h.type === 'note') ?? []

  const renderHit = (hit: SearchHit) => (
    <CommandItem
      key={hit.id}
      value={hit.id}
      onSelect={() => select(hit)}
      className="flex-col items-start gap-1"
    >
      <div className="flex w-full items-center gap-2">
        <span className="truncate font-medium">
          <Highlighted text={hit.titleHighlight ?? hit.title} />
        </span>
        {allLocales && (
          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
            {LOCALE_LABELS[toUiLocale(hit.locale)]}
          </span>
        )}
      </div>
      {(hit.snippet ?? hit.summary) && (
        <p className="line-clamp-2 text-xs text-muted-foreground">
          <Highlighted text={hit.snippet ?? hit.summary ?? ''} />
        </p>
      )}
    </CommandItem>
  )

  const emptyText = !q
    ? m.search_hint()
    : isFetching
      ? m.search_loading()
      : isError
        ? m.search_error()
        : data && !data.enabled
          ? m.search_disabled()
          : m.search_empty()

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label={m.search_open()}
        title={`${m.search_open()} (⌘K)`}
        onClick={() => setOpen(true)}
      >
        <SearchIcon className="size-4" />
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title={m.search_open()}
        description={m.search_placeholder()}
      >
        {/* 結果由伺服器排序，關掉 cmdk 內建的過濾 */}
        <Command shouldFilter={false}>
          <CommandInput
            value={input}
            onValueChange={setInput}
            placeholder={m.search_placeholder()}
          />
          <label className="flex items-center gap-2 border-b px-3 py-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={allLocales}
              onChange={(e) => setAllLocales(e.target.checked)}
            />
            {m.search_all_locales()}
          </label>
          <CommandList>
            {posts.length + notes.length === 0 && <CommandEmpty>{emptyText}</CommandEmpty>}
            {posts.length > 0 && (
              <CommandGroup heading={m.nav_posts()}>{posts.map(renderHit)}</CommandGroup>
            )}
            {notes.length > 0 && (
              <CommandGroup heading={m.nav_notes()}>{notes.map(renderHit)}</CommandGroup>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}

