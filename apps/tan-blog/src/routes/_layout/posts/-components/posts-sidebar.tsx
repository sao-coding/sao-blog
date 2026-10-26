import { useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowUpIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SearchField } from '@/components/search/search-field'
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
  inline = false,
}: {
  tags: TagStat[]
  activeTag?: string
  query?: string
  // inline：手機版放在列表上方的折疊區裡，不要 sticky、卡片外框與「回到頂部」
  inline?: boolean
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
    <aside
      className={cn(
        'flex flex-col gap-8 text-sm',
        !inline && 'sticky top-28 rounded-xl border border-rule glass p-5',
      )}
    >
      <SearchField label={m.posts_search_label()}>
        <input
          type="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={m.posts_search_placeholder()}
          className="search-field-input"
        />
      </SearchField>

      {tags.length > 0 && (
        <section>
          <h2 className="mb-2 font-wenkai text-xs text-muted-foreground">{m.posts_tags_title()}</h2>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 leading-relaxed">
            {visibleTags.map((tag) => {
              const active = tag.slug === activeTag
              return (
                <Link
                  key={tag.slug}
                  to="/posts"
                  search={(prev) => ({ ...prev, tag: active ? undefined : tag.slug })}
                  resetScroll={false}
                  className={cn(
                    "transition-colors hover:text-ink",
                    active ? "text-ink underline decoration-ink/50 underline-offset-4" : "text-foreground/75",
                  )}
                >
                  {tag.name}
                  <sup className="ml-0.5 font-mono text-[0.65rem] text-muted-foreground">{tag.count}</sup>
                </Link>
              )
            })}
          </div>
          {tags.length > COLLAPSED_TAG_COUNT && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 font-mono text-xs text-muted-foreground hover:text-ink"
            >
              {expanded ? "−" : `+${tags.length - COLLAPSED_TAG_COUNT}`}
            </button>
          )}
        </section>
      )}

      {!inline && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex items-center gap-1.5 self-start font-wenkai text-xs text-muted-foreground hover:text-ink"
        >
          <ArrowUpIcon className="size-3.5" />
          {m.fab_back_to_top()}
        </button>
      )}
    </aside>
  )
}
