import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ExternalLinkIcon, FileTextIcon, PlusIcon, SearchIcon } from 'lucide-react'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@sao-blog/ui/components/command'
import { Button } from '@sao-blog/ui/components/button'
import { Kbd } from '@sao-blog/ui/components/kbd'
import { env } from '@sao-blog/env/admin'
import { orpc } from '@/utils/orpc'
import { NAV_GROUPS, NAV_ITEMS } from '@/config/navigation'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

// ⌘K / Ctrl+K：跳到任何頁面、新增內容、搜尋文章標題直接開編輯器
export function CommandMenu() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        // 編輯器裡的 Ctrl+K 是插入連結，交給 Monaco
        if ((e.target as HTMLElement | null)?.closest('.monaco-editor')) return
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  // 開啟面板時才抓文章清單（之後走 React Query 快取）
  const { data: posts } = useQuery({ ...orpc.admin.post.getPosts.queryOptions(), enabled: open })

  const go = (to: string, params?: Record<string, string>) => {
    setOpen(false)
    navigate({ to, params })
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-8 gap-2 bg-background/40 px-2.5 text-muted-foreground shadow-none lg:w-56 lg:justify-start"
        aria-label="搜尋"
      >
        <SearchIcon />
        <span className="hidden lg:inline">搜尋或跳到…</span>
        <Kbd className="ml-auto hidden lg:inline-flex">{isMac ? '⌘' : 'Ctrl'} K</Kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen} title="命令面板" description="搜尋頁面、新增內容或文章" className="sm:max-w-xl">
        {/* 這個 CommandDialog 不會自己包 cmdk 的 <Command>，沒有它 CommandInput 會找不到 store */}
        <Command>
        <CommandInput placeholder="輸入頁面名稱、文章標題…" />
        <CommandList className="max-h-[min(60vh,420px)]">
          <CommandEmpty>找不到符合的項目</CommandEmpty>

          <CommandGroup heading="新增">
            {NAV_ITEMS.filter((i) => i.create).map((i) => (
              <CommandItem key={i.create!.to} value={`${i.create!.label} create new`} onSelect={() => go(i.create!.to)}>
                <PlusIcon />
                {i.create!.label}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />

          {NAV_GROUPS.map((group) => (
            <CommandGroup key={group.label} heading={group.label}>
              {group.items.map((item) => (
                <CommandItem
                  key={item.to}
                  value={[item.title, ...(item.keywords ?? [])].join(' ')}
                  onSelect={() => go(item.to)}
                >
                  <item.icon />
                  {item.title}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}

          {posts?.data && posts.data.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="編輯文章">
                {posts.data.map((post) => (
                  <CommandItem
                    key={post.id}
                    value={`${post.title} ${post.slug} ${post.id}`}
                    onSelect={() => go('/posts/editor/$postId', { postId: post.id })}
                  >
                    <FileTextIcon />
                    <span className="truncate">{post.title}</span>
                    <CommandShortcut className="shrink-0 whitespace-nowrap">{post.status === 'published' ? '已發佈' : post.status === 'draft' ? '草稿' : '封存'}</CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          <CommandSeparator />
          <CommandGroup heading="其他">
            <CommandItem
              value="前往網站 open site blog"
              onSelect={() => {
                setOpen(false)
                window.open(env.VITE_BLOG_URL, '_blank', 'noreferrer')
              }}
            >
              <ExternalLinkIcon />
              前往網站
            </CommandItem>
          </CommandGroup>
        </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
