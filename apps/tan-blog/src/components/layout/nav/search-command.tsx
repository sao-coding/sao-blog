import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Command } from 'cmdk'
import { CornerDownLeftIcon, SearchIcon } from 'lucide-react'
import type { SearchHit } from '@sao-blog/api/lib/search/query'
import { localizeHref } from '#/paraglide/runtime'
import { m } from '#/paraglide/messages'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@sao-blog/ui/components/dialog'
import { Button } from '@sao-blog/ui/components/button'
import { Kbd, KbdGroup } from '@sao-blog/ui/components/kbd'
import { useSearchStore } from '@/store/search-store'
import { currentContentLocale, toUiLocale } from '@/lib/content-locale'
import { LOCALE_LABELS } from '@/components/locale-switcher'
import { hitPath, runSearch, useDebounced } from '@/components/search/search-api'
import { SearchField } from '@/components/search/search-field'
import { SearchHitBody } from '@/components/search/search-hit'

// 全域搜尋（⌘K / Ctrl+K）：cmdk 負責鍵盤導覽，外觀與文章頁的搜尋框、結果共用（components/search）
export function SearchCommand() {
  const open = useSearchStore((state) => state.open)
  const setOpen = useSearchStore((state) => state.setOpen)
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
    <Command.Item key={hit.id} value={hit.id} onSelect={() => select(hit)}>
      <SearchHitBody
        hit={hit}
        aside={allLocales ? LOCALE_LABELS[toUiLocale(hit.locale)] : (hit.categoryName ?? undefined)}
      />
    </Command.Item>
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
        // 手機版改由選單（Drawer）右上角開啟，避免擠壓使用者頭像
        className="hidden lg:inline-flex"
        onClick={() => setOpen(true)}
      >
        <SearchIcon className="size-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="search-palette top-[15vh] w-[calc(100%-2rem)] max-w-xl translate-y-0 gap-0 p-0 sm:max-w-xl"
        >
          <DialogTitle className="sr-only">{m.search_open()}</DialogTitle>
          <DialogDescription className="sr-only">{m.search_placeholder()}</DialogDescription>
          {/* 結果由伺服器排序，關掉 cmdk 內建的過濾 */}
          <Command shouldFilter={false} label={m.search_open()}>
            <div className="search-palette-head">
              <SearchField size="lg">
                <Command.Input
                  value={input}
                  onValueChange={setInput}
                  placeholder={m.search_placeholder()}
                  className="search-field-input"
                />
              </SearchField>
            </div>
            <div className="search-palette-options">
              <button
                type="button"
                aria-pressed={allLocales}
                onClick={() => setAllLocales((v) => !v)}
                className="search-locale-toggle"
              >
                {m.search_all_locales()}
              </button>
            </div>
            <Command.List className="search-palette-list">
              {posts.length + notes.length === 0 && (
                <Command.Empty className="search-palette-empty">{emptyText}</Command.Empty>
              )}
              {posts.length > 0 && <Command.Group heading={m.nav_posts()}>{posts.map(renderHit)}</Command.Group>}
              {notes.length > 0 && <Command.Group heading={m.nav_notes()}>{notes.map(renderHit)}</Command.Group>}
            </Command.List>
            <div className="search-palette-foot" aria-hidden>
              <span className="inline-flex items-center gap-1.5">
                <KbdGroup>
                  <Kbd>↑</Kbd>
                  <Kbd>↓</Kbd>
                </KbdGroup>
                {m.search_key_move()}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Kbd>
                  <CornerDownLeftIcon />
                </Kbd>
                {m.search_key_open()}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Kbd>Esc</Kbd>
                {m.search_key_close()}
              </span>
            </div>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  )
}
