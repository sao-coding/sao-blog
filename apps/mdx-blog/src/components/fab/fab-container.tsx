'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { usePageScrollDirectionSelector } from '@/hooks/use-page-scroll'
import { useIsMobile } from '@/hooks/use-mobile'
import { useFABStore } from '@/store/fab-store'

// ─── FABBase ───────────────────────────────────────────────

interface FABBaseProps {
  /** 是否顯示 */
  show?: boolean
  /** 點擊事件 */
  onClick?: () => void
  /** 無障礙標籤 */
  'aria-label'?: string
  /** 子元素（圖示） */
  children: React.ReactNode
  /** 額外 className */
  className?: string
}

/**
 * FABBase – 單顆浮動按鈕的動畫外殼
 *
 * 使用 AnimatePresence + motion.button 控制進場／退場動畫。
 *
 * @param props - {@link FABBaseProps}
 */
export const FABBase = ({
  show = true,
  onClick,
  children,
  className,
  'aria-label': ariaLabel,
}: FABBaseProps) => {
  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.button
          aria-label={ariaLabel ?? 'Floating action button'}
          initial={{ opacity: 0.3, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0.3, scale: 0.8 }}
          transition={{
              duration: 0.2,
              ease: 'easeOut',
          }}
          onClick={onClick}
          className={cn(
            'mt-2 flex items-center justify-center',
            'size-12 text-lg md:size-10 md:text-base',
            'rounded-xl border backdrop-blur-lg',
            'border-zinc-400/20 dark:border-zinc-500/30',
            'bg-zinc-50/80 shadow-lg dark:bg-neutral-900/80',
            'dark:text-zinc-200',
            'outline-accent hover:opacity-100 focus:opacity-100 focus:outline-none',
            className,
          )}
        >
          {children}
        </motion.button>
      )}
    </AnimatePresence>
  )
}

// ─── FABPortable ───────────────────────────────────────────

interface FABPortableProps {
  /** 點擊事件處理 */
  onClick: () => void
  /** 是否顯示按鈕 */
  show?: boolean
  /** 僅在行動裝置顯示 */
  onlyShowInMobile?: boolean
  /** 無障礙標籤 */
  'aria-label'?: string
  /** 子元素（圖示） */
  children: React.ReactNode
  /** 額外 className */
  className?: string
}

/**
 * FABPortable – 可攜式浮動按鈕
 *
 * 透過 `createPortal` 將按鈕注入至全域 `FABContainer` 容器。
 * 各頁面只需渲染 `FABPortable`，不必重複渲染 `FABContainer`。
 *
 * @param props - {@link FABPortableProps}
 */
export const FABPortable = ({
  onClick,
  show = true,
  onlyShowInMobile,
  children,
  className,
  'aria-label': ariaLabel,
}: FABPortableProps) => {
  // 去 store 裡面拿 containerElement，然後放到 portalElement 變數裡
  const portalElement = useFABStore((s) => s.containerElement)
  const isMobile = useIsMobile()

  if (onlyShowInMobile && isMobile !== true) return null
  if (!portalElement) return null

  return createPortal(
    <FABBase
      show={show}
      onClick={onClick}
      aria-label={ariaLabel}
      className={className}
    >
      {children}
    </FABBase>,
    portalElement,
  )
}

// ─── FABContainer ──────────────────────────────────────────

interface FABContainerProps {
  /** 額外 className */
  className?: string
}

/**
 * FABContainer – 全域浮動按鈕掛載容器
 *
 * 在 Root Layout 渲染一次，作為所有 `FABPortable` 的 portal 目標。
 * 行動端向下滾動時自動滑出螢幕隱藏。
 *
 * @param props - {@link FABContainerProps}
 */
export const FABContainer = ({ className }: FABContainerProps) => {
  const fabContainerRef = useRef<HTMLDivElement>(null)
  const setContainerElement = useFABStore((s) => s.setContainerElement)

  const isMobile = useIsMobile()
  const shouldHide = usePageScrollDirectionSelector((direction) => {
    return isMobile === true && direction === 'down'
  })

  // 掛載後將 DOM 節點存入 store，供 FABPortable 透過 portal 注入
  useEffect(() => {
    setContainerElement(fabContainerRef.current)
    return () => setContainerElement(null)
  }, [setContainerElement])

  return (
    <div
      ref={fabContainerRef}
      data-testid="fab-container"
      className={cn(
        'fixed bottom-[calc(2rem+env(safe-area-inset-bottom))] right-6 z-9',
        'flex flex-col items-center',
        shouldHide ? 'translate-x-[calc(100%+2rem)]' : '',
        'transition-transform duration-300 ease-in-out',
        className,
      )}
    />
  )
}
