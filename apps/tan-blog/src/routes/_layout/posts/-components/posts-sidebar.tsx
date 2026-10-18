import { useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowUpToLineIcon, SearchIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { m } from '#/paraglide/messages'

export interface TagStat {
  slug: string
  name: string
  count: number
}

const COLLAPSED_TAG_COUNT = 12

export function PostsSidebar({
  tags,
  activeTag,
  query,
}: {
  tags: TagStat[]
  activeTag?: string
  query?: string
}) {
  const navigate = useNavigate({ from: '/posts/' })
  const [draft, setDraft] = useState(query ?? '')
  const [expanded, setExpanded] = useState(false)

  // 外部（例如清除篩選）改了 URL 的 q 時，同步回輸入框
  useEffect(() => setDraft(query ?? ''), [query])

  // 輸入時 debounce 寫回 URL，用 replace 避免每個字元都留一筆歷史
  useEffect(() => {
    const next = draft.trim() || undefined
    if (next === (query || undefined)) return
    const timer = setTimeout(() => {
      void navigate({ search: (prev) => ({ ...prev, q: next }), replace: true, resetScroll: false })
    }, 250)
    return () => clearTimeout(timer)
  }, [draft, query, navigate])

  const visibleTags = expanded ? tags : tags.slice(0, COLLAPSED_TAG_COUNT)

  return (
    <aside className="sticky top-24 flex flex-col gap-4">
      <div className="rounded-xl border bg-card/60 p-4 backdrop-blur-sm">
        <label className="flex items-center gap-2 border-b pb-3 text-sm">
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
          <input
            type="search"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={m.posts_search_placeholder()}
            aria-label={m.posts_search_placeholder()}
            className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </label>

        {tags.length > 0 && (
          <>
            <p className="mt-3 mb-2 text-xs text-muted-foreground">{m.posts_tags_title()}</p>
            <div className="flex flex-wrap gap-2">
              {visibleTags.map((tag) => {
                const active = tag.slug === activeTag
                return (
                  <Link
                    key={tag.slug}
                    to="/posts"
                    search={(prev) => ({ ...prev, tag: active ? undefined : tag.slug })}
                    resetScroll={false}
                    className={cn(
                      'rounded-md border px-2 py-1 text-xs transition-colors',
                      active
                        ? 'border-primary/60 bg-primary/15 text-primary'
                        : 'bg-background/40 hover:border-primary/40 hover:text-primary',
                    )}
                  >
                    {tag.name}
                    <span className="ml-1 text-muted-foreground">({tag.count})</span>
                  </Link>
                )
              })}
            </div>
            {tags.length > COLLAPSED_TAG_COUNT && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="mt-3 text-xs text-muted-foreground hover:text-primary"
              >
                {expanded ? '−' : `+${tags.length - COLLAPSED_TAG_COUNT}`}
              </button>
            )}
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="flex items-center gap-2 px-1 text-xs text-muted-foreground hover:text-primary"
      >
        <ArrowUpToLineIcon className="size-3.5" />
        {m.fab_back_to_top()}
      </button>
    </aside>
  )
}
