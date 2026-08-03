import { Outlet, createFileRoute } from '@tanstack/react-router'
import Header from '../../components/layout/header/header'
import Footer from '../../components/layout/footer'
import { PageScrollInfoProvider } from '../../components/providers/page-scroll-info-provider'
import { AdminShortcutProvider } from '../../components/providers/admin-shortcut-provider'
import { FABContainer } from '../../components/fab'

export const Route = createFileRoute('/_layout')({
  component: BlogLayout,
})

function BlogLayout() {
  return (
    <div className="h-full bg-stone-900">
      <PageScrollInfoProvider />
      <Header />
      {/* AdminShortcutProvider 需要 /login route 已就緒（Phase 5 完成），
          按 "." 快捷鍵會導到 /login?redirect=... 或直接進對應的 admin 編輯頁。 */}
      <AdminShortcutProvider>
        <div className="pt-[4.5rem] fill-content px-4 md:px-0">
          <Outlet />
        </div>
      </AdminShortcutProvider>
      <Footer />
      <FABContainer />
    </div>
  )
}
