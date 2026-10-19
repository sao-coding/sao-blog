
import { useEffect, useRef, type ReactNode } from 'react'
import TableOfContent from '@/components/toc'
import type { TocItem } from '@/types/toc'
import { useHeaderStore } from '@/store/header-store'
import { useIsMobile } from '@/hooks/use-mobile'
import { BackToTopFAB } from '@/components/fab'
import { CommentSection } from '@/components/comment'
import { useAdminShortcutStore } from '@/store/admin-shortcut-store'
import { WrittenOn } from '@/components/written-season'

type PostClientPageProps = {
  children: ReactNode
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

  useEffect(() => {
    setOverridePath(`/admin/posts/editor/${postId}`)
    return () => setOverridePath(null)
  }, [postId, setOverridePath])

  return (
    // 比照 innei.in 文章頁：文章 920px ＋ 間距 16px ＋ 目錄 200px，整組 1136px 置中；lg 以下只留文章
    <div className="mx-auto mt-[120px] w-full max-w-[1136px] px-4 xl:px-0">
      <div className="relative min-h-[120px] lg:grid lg:grid-cols-[minmax(0,920px)_200px] lg:gap-4">
        <div className="min-w-0">
          <WrittenOn date={writtenAt} className="mb-6" />
          <article className="prose dark:prose-invert max-w-full" ref={targetRef}>
            {children}
          </article>
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
