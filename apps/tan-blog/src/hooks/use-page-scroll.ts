'use client'

import { useEffect, useRef } from 'react'
import { useScrollStore } from '@/store/scroll-store'
import type { ScrollDirection } from '@/store/scroll-store'

/**
 * 取得目前可靠的 scrollTop
 *
 * 當 Radix Dialog / Drawer 等元件將 body 設為 `position: fixed` 時，
 * `document.documentElement.scrollTop` 會回傳 0。
 * 此函式會從 `body.style.top` 反推真實的滾動位置。
 */
function getReliableScrollTop(): number {
  let currentTop = document.documentElement.scrollTop

  if (currentTop === 0) {
    const bodyStyle = document.body.style
    if (bodyStyle.position === 'fixed') {
      currentTop = Math.abs(Number.parseInt(bodyStyle.top, 10)) || 0
    }
  }

  return currentTop
}

/**
 * 初始化頁面滾動監聽
 *
 * 統一監聽 scroll 與 resize 事件，將資訊寫入 `useScrollStore`。
 * 應於根層級（如 layout）呼叫一次即可。
 */
export function usePageScrollListener() {
  const prevScrollYRef = useRef(0)
  const { updateScrollState, setViewport } = useScrollStore()

  // 視窗尺寸初始化與監聽
  useEffect(() => {
    const update = () => {
      setViewport(window.innerHeight, window.innerWidth)
    }
    update()
    window.addEventListener('resize', update, { passive: true })
    return () => window.removeEventListener('resize', update)
  }, [setViewport])

  // 滾動位置與方向監聽
  useEffect(() => {
    prevScrollYRef.current = getReliableScrollTop()

    const handleScroll = () => {
      const currentTop = getReliableScrollTop()
      const direction: ScrollDirection =
        prevScrollYRef.current - currentTop > 0 ? 'up' : 'down'

      prevScrollYRef.current = currentTop
      updateScrollState({ scrollTop: currentTop, direction })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [updateScrollState])
}

/**
 * 取得滾動位置並以 selector 衍生值
 *
 * @param selector - 接收 scrollTop 並回傳衍生值的函式
 * @returns selector 的回傳值
 *
 * @example
 * ```tsx
 * const isScrolled = usePageScrollLocationSelector(
 *   (scrollTop) => scrollTop > 100
 * )
 * ```
 */
export function usePageScrollLocationSelector<T>(
  selector: (scrollTop: number) => T,
): T {
  return useScrollStore((state) => selector(state.scrollTop))
}

/**
 * 取得目前滾動位置（scrollTop）
 */
export function usePageScrollLocation(): number {
  return useScrollStore((state) => state.scrollTop)
}

/**
 * 取得目前滾動方向
 */
export function usePageScrollDirection(): ScrollDirection | null {
  return useScrollStore((state) => state.direction)
}

/**
 * 取得滾動方向並以 selector 衍生值
 *
 * @param selector - 接收 direction 並回傳衍生值的函式
 * @returns selector 的回傳值
 *
 * @example
 * ```tsx
 * const isScrollingDown = usePageScrollDirectionSelector(
 *   (dir) => dir === 'down'
 * )
 * ```
 */
export function usePageScrollDirectionSelector<T>(
  selector: (direction: ScrollDirection | null) => T,
): T {
  return useScrollStore((state) => selector(state.direction))
}

/**
 * 判斷是否正在向上滾動且已超過指定閾值
 *
 * 常用於「向上滾動時顯示 Header」等場景。
 *
 * @param threshold - 滾動位置閾值（px）
 * @returns 是否滿足條件
 */
export function useIsScrollUpAndPageIsOver(threshold: number): boolean {
  return useScrollStore(
    (state) => state.scrollTop > threshold && state.direction === 'up',
  )
}

/**
 * 取得視窗尺寸
 */
export function useViewport() {
  return useScrollStore((state) => ({
    h: state.viewportHeight,
    w: state.viewportWidth,
  }))
}

/**
 * 以 selector 取得視窗尺寸衍生值
 *
 * @param selector - 接收 `{ h, w }` 並回傳衍生值
 */
export function useViewportSelector<T>(
  selector: (viewport: { h: number; w: number }) => T,
): T {
  return useScrollStore((state) =>
    selector({ h: state.viewportHeight, w: state.viewportWidth }),
  )
}

/**
 * 以 spring 動畫滾動至頁面頂部
 */
export function springScrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
