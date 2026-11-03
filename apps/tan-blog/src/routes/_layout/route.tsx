import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { useLayoutEffect, useRef } from 'react'
import SiteNav from '../../components/layout/nav/site-nav'
import Footer from '../../components/layout/footer'
import { PageScrollInfoProvider } from '../../components/providers/page-scroll-info-provider'
import { AdminShortcutProvider } from '../../components/providers/admin-shortcut-provider'
import { FABContainer } from '../../components/fab'
import { stagePageEnter } from '../../lib/page-enter'
import { moveBetween, reducedMotion, supportsViewTransitionTypes } from '../../lib/page-transition'

export const Route = createFileRoute('/_layout')({
  component: BlogLayout,
})

function BlogLayout() {
  // 用已經畫出來的那一頁（最深的 match），不用 location：location 在新頁資料載完前就換了，那時畫面上還是舊頁
  const pathname = useRouterState({ select: (s) => s.matches[s.matches.length - 1]?.pathname ?? s.location.pathname })
  const contentRef = useRef<HTMLDivElement>(null)
  const prevPath = useRef(pathname)

  // 每一次換頁：新頁的字從暈開的墨收乾、順著方向移入（舊頁的暈開是 View Transition，見 lib/page-transition.ts）。
  // 在畫面畫出來之前就排好，才不會先閃一下。同一頁換篩選、分頁只淡入，由 View Transition 負責
  useLayoutEffect(() => {
    const from = prevPath.current
    prevPath.current = pathname
    const root = contentRef.current
    if (!root || from === pathname || reducedMotion()) return
    const move = moveBetween(from, pathname)
    if (move === 'fade') return
    return stagePageEnter(root, move, supportsViewTransitionTypes())
  }, [pathname])

  return (
    <div className="h-full">
      <PageScrollInfoProvider />
      <SiteNav />
      {/* AdminShortcutProvider 需要 /login route 已就緒（Phase 5 完成），
          按 "." 快捷鍵會導到 /login?redirect=... 或直接進對應的 admin 編輯頁。 */}
      <AdminShortcutProvider>
        <div ref={contentRef} className="pt-[4.5rem] fill-content">
          <Outlet />
        </div>
      </AdminShortcutProvider>
      <Footer />
      <FABContainer />
    </div>
  )
}
