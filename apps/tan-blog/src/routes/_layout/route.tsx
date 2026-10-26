import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { useLayoutEffect, useRef } from 'react'
import Header from '../../components/layout/header/header'
import Footer from '../../components/layout/footer'
import { PageScrollInfoProvider } from '../../components/providers/page-scroll-info-provider'
import { AdminShortcutProvider } from '../../components/providers/admin-shortcut-provider'
import { FABContainer } from '../../components/fab'
import { GardenLayer } from '../../components/garden/garden-layer'
import { gardenFor, isListPath, isSceneSwap } from '../../lib/list-pages'
import { stagePageEnter } from '../../lib/page-enter'

export const Route = createFileRoute('/_layout')({
  component: BlogLayout,
})

function BlogLayout() {
  // 用已經畫出來的那一頁（最深的 match），不用 location：location 在新頁資料載完前就換了，那時畫面上還是舊頁
  const pathname = useRouterState({ select: (s) => s.matches[s.matches.length - 1]?.pathname ?? s.location.pathname })
  const garden = gardenFor(pathname)
  const contentRef = useRef<HTMLDivElement>(null)
  const prevPath = useRef(pathname)

  // 首頁／列表 → 列表：庭與 header 留著不動，只有新頁的字層進場（在畫面畫出來之前就排好，才不會先閃一下）。
  // 回到首頁不排：hero 有自己的進場
  useLayoutEffect(() => {
    const from = prevPath.current
    prevPath.current = pathname
    const root = contentRef.current
    if (!root || !isSceneSwap(from, pathname) || !isListPath(pathname)) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    return stagePageEnter(root)
  }, [pathname])

  return (
    <div className="h-full">
      {/* 庭的畫層掛在這裡而不是各頁：列表頁之間換頁時是同一張，不重建、不閃 */}
      {garden && <GardenLayer stones={garden.stones} scene={garden.scene} />}
      <PageScrollInfoProvider />
      <Header />
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
