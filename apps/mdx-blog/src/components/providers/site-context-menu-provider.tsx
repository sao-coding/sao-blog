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
  ExternalLink,
  Image as ImageIcon,
  Link as LinkIcon,
  RotateCw,
  Shuffle,
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

type TargetInfo = {
  linkHref: string | null
  imgSrc: string | null
}

const EMPTY_TARGET: TargetInfo = {
  linkHref: null,
  imgSrc: null,
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
      linkHref: el.closest('a[href]')?.getAttribute('href') ?? null,
      imgSrc: el.closest('img[src]')?.getAttribute('src') ?? null,
    })
  }, [])

  const handleRandomPost = useCallback(() => {
    const posts = postsData?.status === 'success' ? postsData.data : null
    if (!posts || posts.length === 0) {
      toast.error('文章資料載入中，請再試一次')
      return
    }
    const post = posts[Math.floor(Math.random() * posts.length)]
    router.push(`/posts/${post.slug}`)
  }, [postsData, router])

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
        {(hasLink || hasImage) && <ContextMenuSeparator />}

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
