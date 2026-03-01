'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import DevicesStatus from './devices-status'
import Nav from './nav'
import SiteOwnerAvatar from './site-owner-avatar'
import HeaderTitle from './header-title'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  Drawer,
} from '@/components/ui/drawer'
import MobileMenu from './mobile-menu'
import {
  usePageScrollLocation,
  usePageScrollDirection,
} from '@/hooks/use-page-scroll'

/** 判斷「已滾動」的閾值（px） */
const SCROLL_THRESHOLD = 50

const Header = () => {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const isMobile = useIsMobile(1024)

  // 從共用 store 取得滾動位置與方向
  const scrollTop = usePageScrollLocation()
  const scrollDirection = usePageScrollDirection()

  const isScrolled = scrollTop > SCROLL_THRESHOLD

  // 派生狀態計算
  const isTargetPage =
    pathname === '/' ||
    pathname?.startsWith('/posts') ||
    // 將 /notes/topics 視為列表而非目標頁（不顯示背景）
    (pathname?.startsWith('/notes') && !pathname?.startsWith('/notes/topics'))

  const showBackground = isTargetPage && isScrolled

  const isDetailPage =
    pathname?.startsWith('/posts/') ||
    (pathname?.startsWith('/notes/') && !pathname?.startsWith('/notes/topics'))

  const showPinnedNav =
    isDetailPage && isScrolled && scrollDirection === 'up'

  // 中央導航的樣式
  const centralNavClass = cn(
    'transition-all duration-300 ease-in-out',
    isDetailPage && isScrolled
      ? 'opacity-0 -translate-y-1 pointer-events-none'
      : 'opacity-100 translate-y-0'
  )

  // 固定導航的樣式
  const pinnedNavClass = cn(
    'fixed top-[3.375rem] left-1/2 -translate-x-1/2 z-50',
    'bg-background',
    'transition-all duration-300 ease-in-out',
    showPinnedNav && isDetailPage
      ? 'opacity-100 translate-y-0'
      : 'opacity-0 -translate-y-4 pointer-events-none'
  )

  return (
    <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 h-[4.5rem] border-b transition-colors duration-300',
          showBackground
            ? 'border-gray-700/50 bg-background/40 backdrop-blur-md'
            : 'border-transparent'
        )}
      >
        <div className="grid grid-cols-[4.5rem_auto_4.5rem] max-w-7xl mx-auto h-full lg:px-8">
          <MobileMenu />
          <div>
            <div className="relative flex justify-center items-center space-x-4 h-full">
              {/* 如果是手機模式 並且 showBackground 就顯示標題 不然就顯示 SiteOwnerAvatar DevicesStatus */}
              {showBackground && isMobile === true ? (
                <HeaderTitle showBackground={showBackground} />
              ) : (
                <>
                  <SiteOwnerAvatar />
                  <DevicesStatus />
                </>
              )}
            </div>
          </div>
          {isMobile === false && (
            <div className="relative grow justify-center items-center hidden lg:flex">
              <Nav
                id="central"
                variant={showBackground ? 'integrated' : 'default'}
                className={centralNavClass}
              />
              <HeaderTitle showBackground={showBackground} />
            </div>
          )}

          <div className=""></div>
        </div>

        {/* 固定導航 - 使用條件渲染配合 CSS 過渡 */}
        {isMobile === false && (
          <Nav
            id="pinned"
            className={pinnedNavClass}
            variant={showBackground ? 'integrated' : 'default'}
          />
        )}
      </header>
    </Drawer>
  )
}

export default Header
