'use client'

import { usePageScrollListener } from '@/hooks/use-page-scroll'

/**
 * PageScrollInfoProvider – 初始化全域滾動監聽
 *
 * 應掛載於 blog layout 層級，負責將 scroll / resize 事件
 * 同步至 `useScrollStore`，供所有子元件共用。
 */
export function PageScrollInfoProvider() {
  usePageScrollListener()
  return null
}
