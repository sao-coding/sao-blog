import React from 'react'
import { TocItem } from '@/types/toc'
import { cn } from '@/lib/utils'
import { AnimatePresence, m } from 'motion/react'

const getTextClass = (depth?: number, isActive?: boolean) => {
  if (isActive) return 'text-primary'
  switch (depth) {
    case 1: return 'font-medium text-slate-900 dark:text-slate-100'
    case 2: return 'text-slate-700 dark:text-slate-300'
    case 3: return 'text-slate-600 dark:text-slate-400'
    default: return 'text-slate-600 dark:text-slate-400'
  }
}

/** variants 定義，讓 enter / exit 使用各自的 transition */
const tocItemVariants = {
  hidden: { x: 16, opacity: 0 },
  visible: (delay: number) => ({
    x: 0,
    opacity: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 28,
      mass: 0.8,
      delay,
    },
  }),
  exit: {
    x: 16,
    opacity: 0,
    transition: { duration: 0.15, ease: 'easeIn' as const },
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
                  className="absolute inset-y-0 left-0 w-0.5 rounded-r-lg bg-primary"
                  transition={{
                    type: 'spring',
                    stiffness: 380,
                    damping: 30,
                  }}
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
                'flex items-start gap-2 group leading-normal',
                getTextClass(depth, isActive),
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
                  'truncate transition-colors duration-150 group-hover:text-primary',
                  isActive && 'translate-x-2 transition-transform duration-150',
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