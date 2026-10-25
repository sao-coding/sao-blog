
import { useEffect, useRef, type ReactNode } from 'react'
import TableOfContent from '@/components/toc'
import type { TocItem } from '@/types/toc'
import { useHeaderStore } from '@/store/header-store'
import { useIsMobile } from '@/hooks/use-mobile'
import { BackToTopFAB } from '@/components/fab'
import { CommentSection } from '@/components/comment'
import { useAdminShortcutStore } from '@/store/admin-shortcut-store'
import { WrittenOn } from '@/components/written-season'
import { LetterPaper, LetterSignature } from '@/components/letter-paper'
import { client } from '@/lib/orpc'
import { postTitleTransitionName, rememberViewedPost } from '@/lib/post-transitions'

type PostClientPageProps = {
  children: ReactNode
  slug: string
  postId: string
  writtenAt: Date | string
  showToc: boolean
  toc: TocItem[]
  metaData: {
    category: string
    tags: string[]
    title: string
    url: string
  }
}

export function PostClientPage({
  children,
  slug,
  postId,
  writtenAt,
  showToc,
  toc,
  metaData,
}: PostClientPageProps) {
  const targetRef = useRef<HTMLDivElement | null>(null)
  const { setPostState } = useHeaderStore()
  const { setOverridePath } = useAdminShortcutStore()
  const isMobile = useIsMobile(1024)

  useEffect(() => {
    // 設定 header 狀態
    setPostState({
      category: metaData.category,
      tags: metaData.tags,
      title: metaData.title,
      url: metaData.url,
    })
  }, [metaData])

  // 回到列表時，標題要飛回這一篇那一列
  useEffect(() => rememberViewedPost(slug), [slug])

  useEffect(() => {
    setOverridePath(`/admin/posts/editor/${postId}`)
    return () => setOverridePath(null)
  }, [postId, setOverridePath])

  // 閱讀數：捲到留言區才算「真的讀完」。詳情頁是 ISR 快取，不能在 loader 裡加，所以由 client 呼叫；
  // 同一分頁同一篇只算一次。是否排除站長自己，由後端判斷（管理員登入狀態、VIEW_IGNORE_IPS）
  const viewSentinelRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = viewSentinelRef.current
    if (!el) return
    const key = `viewed:${postId}`
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return
      observer.disconnect()
      try {
        if (sessionStorage.getItem(key)) return
        sessionStorage.setItem(key, '1')
      } catch {
        // 無痕模式等拿不到 sessionStorage：照算，頂多重複計
      }
      client.post.addView({ id: postId }).catch(() => {})
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [postId])

  return (
    // 比照 innei.in 文章頁：文章 920px ＋ 間距 16px ＋ 目錄 200px，整組 1136px 置中；lg 以下只留文章
    <div className="mx-auto mt-[120px] w-full max-w-[1136px] px-4 xl:px-0">
      <div className="relative min-h-[120px] lg:grid lg:grid-cols-[minmax(0,920px)_200px] lg:gap-4">
        <div className="min-w-0">
          <LetterPaper date={writtenAt} className="mb-12">
            {/* 文章標題：原本只出現在捲動後的 header，手機與首屏都看不到 */}
            <header className="mb-8">
              <h1
                className="font-wenkai text-3xl leading-snug text-foreground text-balance [view-transition-class:post-title] sm:text-4xl"
                style={{ viewTransitionName: postTitleTransitionName(slug) }}
              >
                {metaData.title}
              </h1>
              <WrittenOn date={writtenAt} className="mt-3" />
            </header>
            <article className="prose dark:prose-invert max-w-full" ref={targetRef}>
              {children}
            </article>
            <LetterSignature date={writtenAt} />
          </LetterPaper>
          <div ref={viewSentinelRef} aria-hidden />
          <CommentSection postId={postId} lazyLoad />
        </div>
        <div className="relative hidden lg:block">
          {!isMobile && showToc && <TableOfContent toc={toc} targetRef={targetRef} />}
        </div>
      </div>
      {isMobile && <BackToTopFAB />}
    </div>
  )
}
