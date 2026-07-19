'use client'

import {
  useCallback,
  useEffect,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Copy,
  ExternalLink,
  Image as ImageIcon,
  Link as LinkIcon,
  MessageSquareQuote,
  RotateCw,
  Search,
  Shuffle,
  Sparkles,
} from 'lucide-react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { orpc } from '@/lib/orpc'
import { springScrollToTop } from '@/hooks/use-page-scroll'
import { useCommentQuoteStore } from '@/store/comment-quote-store'

type TargetInfo = {
  selectionText: string
  linkHref: string | null
  imgSrc: string | null
}

const EMPTY_TARGET: TargetInfo = {
  selectionText: '',
  linkHref: null,
  imgSrc: null,
}

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max)}…` : text
}

export function SiteContextMenuProvider({
  children,
}: {
  children: ReactNode
}) {
  const router = useRouter()
  const [target, setTarget] = useState<TargetInfo>(EMPTY_TARGET)

  const { data: postsData } = useQuery(
    orpc.post.getPosts.queryOptions({ input: {} }),
  )

  useEffect(() => {
    function bypassOnShift(event: MouseEvent) {
      if (event.shiftKey) {
        event.stopPropagation()
      }
    }
    window.addEventListener('contextmenu', bypassOnShift, { capture: true })
    return () =>
      window.removeEventListener('contextmenu', bypassOnShift, {
        capture: true,
      })
  }, [])

  const handleContextMenu = useCallback((event: ReactMouseEvent) => {
    const el = event.target as HTMLElement
    setTarget({
      selectionText: document.getSelection()?.toString() ?? '',
      linkHref: el.closest('a[href]')?.getAttribute('href') ?? null,
      imgSrc: el.closest('img[src]')?.getAttribute('src') ?? null,
    })
  }, [])

  const handleQuoteToComment = useCallback(() => {
    useCommentQuoteStore.getState().setPendingQuote(target.selectionText)
    document
      .getElementById('comment-section')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [target.selectionText])

  const handleRandomPost = useCallback(() => {
    const posts = postsData?.status === 'success' ? postsData.data : null
    if (!posts || posts.length === 0) {
      toast.error('文章資料載入中，請再試一次')
      return
    }
    const post = posts[Math.floor(Math.random() * posts.length)]
    router.push(`/posts/${post.slug}`)
  }, [postsData, router])

  const hasSelection = target.selectionText.length > 0
  const hasLink = target.linkHref !== null
  const hasImage = target.imgSrc !== null

  return (
    <ContextMenu>
      <ContextMenuTrigger
        className="contents select-auto"
        onContextMenu={handleContextMenu}
      >
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <div className="flex items-center gap-1 p-1">
          <ContextMenuItem
            className="flex-1 justify-center gap-0"
            onClick={() => router.back()}
          >
            <ArrowLeft />
          </ContextMenuItem>
          <ContextMenuItem
            className="flex-1 justify-center gap-0"
            onClick={() => router.forward()}
          >
            <ArrowRight />
          </ContextMenuItem>
          <ContextMenuItem
            className="flex-1 justify-center gap-0"
            onClick={() => window.location.reload()}
          >
            <RotateCw />
          </ContextMenuItem>
        </div>
        <ContextMenuSeparator />

        {hasSelection && (
          <>
            <ContextMenuItem
              onClick={() =>
                navigator.clipboard.writeText(target.selectionText)
              }
            >
              <Copy /> 複製
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() =>
                window.open(
                  `https://www.google.com/search?q=${encodeURIComponent(target.selectionText)}`,
                  '_blank',
                )
              }
            >
              <Search /> 搜尋「{truncate(target.selectionText, 16)}」
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() =>
                window.open(
                  `https://chatgpt.com/?q=${encodeURIComponent(target.selectionText)}`,
                  '_blank',
                )
              }
            >
              <Sparkles /> 詢問 ChatGPT
            </ContextMenuItem>
            <ContextMenuItem onClick={handleQuoteToComment}>
              <MessageSquareQuote /> 引用評論
            </ContextMenuItem>
          </>
        )}
        {hasLink && (
          <>
            <ContextMenuItem
              onClick={() => window.open(target.linkHref as string, '_blank')}
            >
              <ExternalLink /> 在新分頁開啟連結
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() =>
                navigator.clipboard.writeText(target.linkHref as string)
              }
            >
              <LinkIcon /> 複製連結網址
            </ContextMenuItem>
          </>
        )}
        {hasImage && (
          <>
            <ContextMenuItem
              onClick={() => window.open(target.imgSrc as string, '_blank')}
            >
              <ExternalLink /> 在新分頁開啟圖片
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() =>
                navigator.clipboard.writeText(target.imgSrc as string)
              }
            >
              <ImageIcon /> 複製圖片網址
            </ContextMenuItem>
          </>
        )}
        {(hasSelection || hasLink || hasImage) && <ContextMenuSeparator />}

        <ContextMenuItem onClick={handleRandomPost}>
          <Shuffle /> 隨機文章
        </ContextMenuItem>
        <ContextMenuItem onClick={() => springScrollToTop()}>
          <ArrowUp /> 回到頂部
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuGroup>
          <ContextMenuLabel className="text-[11px] opacity-60">
            按住 Shift 右鍵可叫出瀏覽器原生選單
          </ContextMenuLabel>
        </ContextMenuGroup>
      </ContextMenuContent>
    </ContextMenu>
  )
}
