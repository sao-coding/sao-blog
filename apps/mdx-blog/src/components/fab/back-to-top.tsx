'use client'

import { ArrowUpIcon } from 'lucide-react'
import {
  usePageScrollLocationSelector,
  useViewportSelector,
  springScrollToTop,
} from '@/hooks/use-page-scroll'
import { FABPortable } from './fab-container'

/**
 * BackToTopFAB – 回到頂部浮動按鈕
 *
 * 當頁面滾動超過視窗高度 1/5 時顯示，點擊後平滑滾動回頂部。
 */
export const BackToTopFAB = () => {
  const windowHeight = useViewportSelector((v) => v.h)
  const shouldShow = usePageScrollLocationSelector(
    (scrollTop) => scrollTop > windowHeight / 5,
  )

  return (
    <FABPortable
      onClick={springScrollToTop}
      show={shouldShow}
      aria-label="回到頂部"
    >
      <ArrowUpIcon className="size-5"/>
    </FABPortable>
  )
}
