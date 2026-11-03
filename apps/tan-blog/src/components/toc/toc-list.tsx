import React from 'react'
import type { TocItem } from '@/types/toc'
import { cn } from '@/lib/utils'
import { AnimatePresence, m } from 'motion/react'
import { TRANSITION } from '@/lib/motion'

// 眉批式目錄（2026-11-02）：頁邊的淡墨小字，讀到的那一節轉朱、左邊一小筆朱跟著移；第一層 --ink-2、更深的 --ink-3
const getTextClass = (depth: number, rootDepth: number, isActive?: boolean) => {
  if (isActive) return 'text-zhu'
  return depth <= rootDepth ? 'text-ink-2' : 'text-ink-3'
}

/** variants 定義，讓 enter / exit 使用各自的 transition */
const tocItemVariants = {
  hidden: { x: 16, opacity: 0 },
  visible: (delay: number) => ({
    x: 0,
    opacity: 1,
    transition: { ...TRANSITION.in, delay },
  }),
  exit: {
    x: 16,
    opacity: 0,
    transition: TRANSITION.out,
  },
}

/**
 * TOC 清單元件，支援遞迴渲染子項目。
 * LazyMotion 由上層 TableOfContent 提供。
 */
export const TocList: React.FC<{
  items?: TocItem[]
  activeId?: string
  rootDepth?: number
  baseDelay?: number
}> = ({ items = [], activeId, rootDepth = 1, baseDelay = 0 }) => {
  if (!items || items.length === 0) return null

  return (
    <>
      {items.map((item, index) => {
        const depth = item.depth ?? 1
        const renderDepth = depth - rootDepth
        const paddingLeft =
          depth >= rootDepth ? `${renderDepth * 0.6 + 0.5}rem` : '0.5rem'
        const isActive = activeId === item.href?.slice(1)
        const itemDelay = baseDelay + index * 0.025

        return (
          <li key={item.href || item.value} className="toc-item relative">
            <AnimatePresence>
              {isActive && (
                <m.span
                  layoutId="active-toc-item"
                  className="absolute top-[0.35em] -left-3 h-[1.1em] w-[2px] bg-zhu"
                  transition={TRANSITION.move}
                />
              )}
            </AnimatePresence>

            <m.a
              href={item.href}
              onClick={(e) => {
                e.preventDefault()
                const targetId = item.href?.slice(1)
                if (!targetId) return
                document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' })
              }}
              className={cn(
                'group flex items-start gap-2 font-display text-[13px] leading-relaxed transition-colors',
                getTextClass(depth, rootDepth, isActive),
              )}
              variants={tocItemVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              custom={itemDelay}
              style={{ paddingLeft }}
            >
              <span
                className={cn(
                  'line-clamp-2 transition-colors duration-150 group-hover:text-zhu',
                )}
              >
                {item.value}
              </span>
            </m.a>

            {item.children && item.children.length > 0 && (
              <div className="mt-2">
                <TocList
                  items={item.children}
                  activeId={activeId}
                  rootDepth={rootDepth}
                  baseDelay={itemDelay + 0.04}
                />
              </div>
            )}
          </li>
        )
      })}
    </>
  )
}

export default TocList