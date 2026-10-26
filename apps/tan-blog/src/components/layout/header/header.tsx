import { useState } from 'react'
import { useLocation } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import DevicesStatus from './devices-status'
import Nav from './nav'
import SiteOwnerAvatar from './site-owner-avatar'
import HeaderTitle from './header-title'
import { useIsMobile } from '@/hooks/use-mobile'
import { Drawer } from '@sao-blog/ui/components/drawer'
import MobileMenu from './mobile-menu'
import { useScrollStore } from '@/store/scroll-store'
import UserButton from './user-button'
import { SearchCommand } from './search-command'
import { LoginDialog } from '@/components/login-dialog'
import ProtoHeader from './proto/proto-header'
import { useNavProto } from './proto/nav-model'
import { ProtoSwitch } from './proto/proto-parts'

/** 判斷「已滾動」的閾值（px） */
const SCROLL_THRESHOLD = 50

/** 文章 / 日記詳情頁（/notes/topics 是專欄列表，不算） */
export function isDetailPath(pathname: string) {
  return (
    pathname.startsWith('/posts/') ||
    (pathname.startsWith('/notes/') && !pathname.startsWith('/notes/topics'))
  )
}

// 階段 9 原型：開發時左下角可以切換現行／墨帶＋燈（定案後拿掉）
const Header = () => {
  const proto = useNavProto()
  return (
    <>
      {proto === 'current' ? <CurrentHeader /> : <ProtoHeader />}
      {import.meta.env.DEV && <ProtoSwitch />}
    </>
  )
}

const CurrentHeader = () => {
  const pathname = useLocation({ select: (l) => l.pathname })
  const [drawerOpen, setDrawerOpen] = useState(false)
  const isMobile = useIsMobile(1024)
  const isDetailPage = isDetailPath(pathname)

  // 只訂閱布林值：原本訂閱 scrollTop，每個 scroll 事件都會重繪整個 header
  const isScrolled = useScrollStore((s) => s.scrollTop > SCROLL_THRESHOLD)
  const showPinnedNav = useScrollStore(
    (s) => isDetailPage && s.scrollTop > SCROLL_THRESHOLD && s.direction === 'up'
  )

  // 所有頁面捲動後都顯示毛玻璃背景（原本只限首頁 / 文章 / 日記，新頁面如 /fcircle 會漏掉）
  const showBackground = isScrolled
  const navVariant = showBackground ? 'integrated' : 'default'

  return (
    <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
      <header
        className={cn(
          // view-transition-name：文章換頁的展卷動畫時 header 自成一層、維持不動
          'fixed inset-x-0 top-0 z-50 h-[4.5rem] border-b transition-colors duration-300 [view-transition-name:site-header]',
          showBackground
            ? 'border-rule glass'
            : 'border-transparent'
        )}
      >
        <div className="grid grid-cols-[4.5rem_auto_4.5rem] max-w-7xl mx-auto h-full lg:px-8">
          <MobileMenu isMobile={isMobile} />
          <div className="relative flex justify-center items-center space-x-4 h-full">
            {/* 手機版捲動後顯示標題，否則顯示站長頭像與裝置狀態 */}
            {showBackground && isMobile ? (
              <HeaderTitle showBackground={showBackground} />
            ) : (
              <>
                <SiteOwnerAvatar />
                <DevicesStatus />
              </>
            )}
          </div>
          {!isMobile && (
            <div className="relative grow justify-center items-center hidden lg:flex">
              <Nav
                id="central"
                variant={navVariant}
                className={cn(
                  'transition-all duration-300 ease-in-out',
                  isDetailPage && isScrolled
                    ? 'opacity-0 -translate-y-1 pointer-events-none'
                    : 'opacity-100 translate-y-0'
                )}
              />
              <HeaderTitle showBackground={showBackground} />
            </div>
          )}

          <div className="flex items-center justify-center gap-1">
            <SearchCommand />
            <UserButton />
          </div>
        </div>

        {/* 詳情頁往上捲時浮出的導航 */}
        {!isMobile && isDetailPage && (
          <Nav
            id="pinned"
            variant={navVariant}
            className={cn(
              'fixed top-[3.375rem] left-1/2 -translate-x-1/2 z-50 bg-background',
              'transition-all duration-300 ease-in-out',
              showPinnedNav
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 -translate-y-4 pointer-events-none'
            )}
          />
        )}
      </header>
      <LoginDialog />
    </Drawer>
  )
}

export default Header
