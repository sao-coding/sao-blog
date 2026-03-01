'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import TableOfContent from '@/components/toc'
import { ScrollProgressIndicator } from '@/components/scroll-progress-indicator'
import type { TocItem } from 'remark-flexible-toc'
import { useHeaderStore } from '@/store/header-store'
import { useIsMobile } from '@/hooks/use-mobile'
import { BackToTopFAB } from '@/components/fab'
import { CommentSection } from '@/components/comment'

type PostClientPageProps = {
  children: ReactNode
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
  showToc,
  toc,
  metaData,
}: PostClientPageProps) {
  const targetRef = useRef<HTMLDivElement | null>(null)
  const { setPostState } = useHeaderStore()
  // 1024
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

  return (
    <div className="container m-auto mt-[120px] max-w-7xl px-2 md:px-6 lg:px-4 xl:px-0">
      <div className="relative flex min-h-[120px] grid-cols-[auto_200px] lg:grid">
        <div className="min-w-0">
          <article className="prose dark:prose-invert max-w-full" ref={targetRef}>
            {children}
          </article>
          <CommentSection postId="article-slug" lazyLoad />
        </div>
        <div className="relative hidden lg:block">
          {!isMobile && showToc && <TableOfContent toc={toc} targetRef={targetRef} />}
        </div>
      </div>
      {isMobile && <BackToTopFAB />}
    </div>
  )
}
