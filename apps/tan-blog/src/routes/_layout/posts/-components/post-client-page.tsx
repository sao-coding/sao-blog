
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import TableOfContent from '@/components/toc'
import type { TocItem } from '@/types/toc'
import { useHeaderStore } from '@/store/header-store'
import { useIsMobile } from '@/hooks/use-mobile'
import { CommentSection } from '@/components/comment'
import useScrollspy from '@/hooks/use-scrollspy'
import { ReadingPanel, useReadProgress } from '@/components/post-reading/reading-panel'
import { ReadingIsland } from '@/components/post-reading/reading-island'
import { CommentDialog } from '@/components/post-reading/comment-dialog'
import { CategorySeal } from '@/components/post-reading/category-seal'
import { EndStamps } from '@/components/post-reading/stamp'
import { useAdminShortcutStore } from '@/store/admin-shortcut-store'
import { WrittenOn } from '@/components/written-season'
import { LetterPaper, LetterSignature } from '@/components/letter-paper'
import { client } from '@/lib/orpc'
import { Link } from '@tanstack/react-router'
import { m } from '#/paraglide/messages'
import { siteTime } from '@/lib/site-time'
import { anchorTitleStyle, rememberAnchor } from '@/lib/page-transition'

const SCROLLSPY_OPTIONS: IntersectionObserverInit = { rootMargin: '0% 0% -85% 0%' }
const flatIds = (items: TocItem[]): string[] =>
  items.flatMap((i) => [...(i.href ? [i.href.slice(1)] : []), ...flatIds(i.children ?? [])])

type PostClientPageProps = {
  children: ReactNode
  slug: string
  postId: string
  writtenAt: Date | string
  updatedAt: Date | string
  /** 預估閱讀時間（分鐘） */
  readingTime: number
  category: { name: string; slug: string }
  tagLinks: { name: string; slug: string }[]
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
  updatedAt,
  readingTime,
  category,
  tagLinks,
  showToc,
  toc,
  metaData,
}: PostClientPageProps) {
  const targetRef = useRef<HTMLDivElement | null>(null)
  const { setPostState } = useHeaderStore()
  const { setOverridePath } = useAdminShortcutStore()
  const isMobile = useIsMobile(1024)
  const progress = useReadProgress(targetRef)
  const [commentOpen, setCommentOpen] = useState(false)
  const tocIds = useMemo(() => flatIds(toc), [toc])
  const activeId = useScrollspy(tocIds, SCROLLSPY_OPTIONS)

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
  useEffect(() => rememberAnchor(`/posts/${slug}`), [slug])

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
          <LetterPaper className="mb-12">
            {/* 文章標題：原本只出現在捲動後的 header，手機與首屏都看不到 */}
            <header className="mb-8">
              {/* 分類：左邊一方朱印、右邊分類名與標籤（跟留言區標題同一個擺法） */}
              <CategorySeal name={category.name} slug={category.slug} tags={tagLinks} className="mb-6" />
              <h1
                className="font-display text-3xl leading-snug text-ink-1 text-balance sm:text-4xl"
                style={anchorTitleStyle(`/posts/${slug}`)}
              >
                {metaData.title}
              </h1>
              {/* 寫於・節氣、更新於（隔天以後改過才寫） */}
              <p className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-ink-3">
                <WrittenOn date={writtenAt} />
                {siteTime(updatedAt).diff(siteTime(writtenAt), 'day') >= 1 && (
                  <time dateTime={siteTime(updatedAt).toISOString()} className="font-display">
                    {m.post_updated_on({ date: siteTime(updatedAt).format('YYYY-MM-DD') })}
                  </time>
                )}
              </p>
            </header>
            <article className="prose dark:prose-invert max-w-full" ref={targetRef}>
              {children}
            </article>
            <LetterSignature date={writtenAt} />
            {/* 讀者在落款旁蓋自己的印（蓋印＝原本的按讚） */}
            <EndStamps postId={postId} />
          </LetterPaper>
          <div ref={viewSentinelRef} aria-hidden />
          <CommentSection postId={postId} lazyLoad />
        </div>
        <div className="relative hidden lg:block">
          {!isMobile && showToc && <TableOfContent toc={toc} targetRef={targetRef} showProgress={false} />}
          {/* 目錄底下、離畫面下緣一段高度的閱讀區塊：整欄高度裡 sticky，捲到文末就停 */}
          {!isMobile && (
            <div className="pointer-events-none absolute inset-0">
              <div className="pointer-events-auto sticky top-[calc(100vh-15rem)] ml-4">
                <ReadingPanel postId={postId} readingTime={readingTime} progress={progress} onComment={() => setCommentOpen(true)} />
              </div>
            </div>
          )}
        </div>
      </div>
      {isMobile && (
        <ReadingIsland
          postId={postId}
          readingTime={readingTime}
          progress={progress}
          toc={toc}
          activeId={activeId}
          onComment={() => setCommentOpen(true)}
        />
      )}
      <CommentDialog postId={postId} open={commentOpen} onOpenChange={setCommentOpen} />
    </div>
  )
}
