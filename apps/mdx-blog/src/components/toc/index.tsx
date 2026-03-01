'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { TocItem } from '@/types/toc'
import TocList from './toc-list'
import useScrollspy from '@/hooks/use-scrollspy'
import { domAnimation, LazyMotion, LayoutGroup } from 'motion/react'
import { ScrollProgressIndicator } from '../scroll-progress-indicator'

const getMinDepth = (items: TocItem[]): number => {
  let min = Infinity
  for (const item of items) {
    if (item.depth) {
      min = Math.min(min, item.depth)
    }
    if (item.children && item.children.length > 0) {
      min = Math.min(min, getMinDepth(item.children))
    }
  }
  return min
}

/**
 * Recursively extracts IDs from TOC items.
 * @param items - The array of TOC items.
 * @returns An array of IDs.
 */
const getIds = (items: TocItem[]): string[] => {
  return items.reduce((acc: string[], item) => {
    if (item.href) {
      // remove '#' from href
      acc.push(item.href.slice(1))
    }
    if (item.children) {
      acc.push(...getIds(item.children))
    }
    return acc
  }, [])
}

/**
 * TableOfContent 元件
 * - 顯示文章目錄，支援多層縮排與分級字級
 */
// export const TableOfContent = ({ toc }: { toc: TocItem[] }) => {
const TableOfContent = ({
  toc,
  targetRef,
}: {
  toc: TocItem[]
  targetRef: React.RefObject<HTMLElement | null>
}) => {
  const containerRef = useRef<HTMLUListElement>(null)
  const [ids, setIds] = useState<string[]>([])

  useEffect(() => {
    const newIds = getIds(toc)
    setIds(newIds)
  }, [toc])

  const rootDepth = useMemo(() => {
    if (!toc || toc.length === 0) return 1
    const minDepth = getMinDepth(toc)
    return minDepth === Infinity ? 1 : minDepth
  }, [toc])

  const activeId = useScrollspy(ids, {
    rootMargin: '0% 0% -85% 0%',
  })

  useEffect(() => {
    const setMaxWidth = () => {
      if (containerRef.current) {
        containerRef.current.style.maxWidth = `${
          window.innerWidth -
          containerRef.current.getBoundingClientRect().x -
          60
        }px`
      }
    }

    setMaxWidth()

    window.addEventListener('resize', setMaxWidth)
    return () => {
      window.removeEventListener('resize', setMaxWidth)
    }
  }, [])
  if (!toc) return null

  return (
    // 這裡加入 sticky 與 top 偏移，讓目錄在滾動時固定顯示
    <aside className="sticky top-[120px] h-[calc(100vh-6rem-4.5rem-150px-120px)] ml-4">
      <div className="relative h-full" aria-label="Table of contents">
        <div className="max-h-[60vh] overflow-visible absolute flex flex-col">
          <LazyMotion features={domAnimation}>
            <LayoutGroup>
              <ul ref={containerRef} className="px-2 space-y-2 relative">
                <TocList key={toc.length} items={toc} activeId={activeId} rootDepth={rootDepth} />
              </ul>
            </LayoutGroup>
          </LazyMotion>
          <ScrollProgressIndicator target={targetRef} />
        </div>
      </div>
    </aside>
  )
}

export default TableOfContent
