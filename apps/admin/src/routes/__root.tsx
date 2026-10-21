import { Link, Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { AuthProvider } from "@/components/auth-provider"
import { TooltipProvider } from "@sao-blog/ui/components/tooltip"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@sao-blog/ui/components/sidebar"
import AppSidebar from "@/components/app-sidebar"
import { Separator } from "@sao-blog/ui/components/separator"
import { AdminBreadcrumb } from "@/components/layout/admin-breadcrumb"
import { CommandMenu } from "@/components/layout/command-menu"
import { Button } from "@sao-blog/ui/components/button"
import { CompassIcon, ExternalLinkIcon } from 'lucide-react'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@sao-blog/ui/components/empty"
import { env } from "@sao-blog/env/admin";
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { OverlayProvider } from '@/components/overlay/overlay-provider'

import '@sao-blog/ui/globals.css'
import { authClient } from '@/lib/auth-client'
import { queryClient } from '@/utils/orpc'

export const Route = createRootRoute({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession()

    // 未登入 → 去 login
    if (!session) {
      const redirect = `${env.VITE_BLOG_URL}/login?redirect=${encodeURIComponent(
        window.location.pathname
      )}`

      window.location.href = redirect
      return
    }

    // 已登入但權限不足或被封鎖 → 回首頁
    if (session.user.role === "user" || session.user.banned) {
      window.location.href = env.VITE_BLOG_URL
      return
    }

    return { session }
  },
  notFoundComponent: () => (
    <Empty className="min-h-[60vh]">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CompassIcon />
        </EmptyMedia>
        <EmptyTitle>找不到這個頁面</EmptyTitle>
        <EmptyDescription>網址可能打錯了，或這個頁面已經移除。</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button render={<Link to="/" />} nativeButton={false}>
          回到儀表板
        </Button>
      </EmptyContent>
    </Empty>
  ),
  component: RootLayout,
})

function RootLayout() {

  return (
    <>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <OverlayProvider>
            <TooltipProvider>
              <div className="admin">
                <SidebarProvider>
                  <AppSidebar />
                  <SidebarInset className="min-w-0">
                    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/75 px-3 backdrop-blur-md md:rounded-t-xl md:px-4">
                      <SidebarTrigger className="-ml-1" />
                      <Separator
                        orientation="vertical"
                        className="mr-1 data-[orientation=vertical]:h-4 data-vertical:self-center"
                      />
                      <AdminBreadcrumb />
                      <div className="ml-auto flex shrink-0 items-center gap-1.5">
                        <CommandMenu />
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          render={<a href={env.VITE_BLOG_URL} target="_blank" rel="noreferrer" />}
                          nativeButton={false}
                          aria-label="前往網站"
                          title="前往網站"
                          className="shrink-0"
                        >
                          <ExternalLinkIcon />
                        </Button>
                      </div>
                    </header>
                    <main className="mx-auto w-full max-w-7xl min-w-0 flex-1 p-4 md:p-6">
                      <Outlet />
                    </main>
                  </SidebarInset>
                </SidebarProvider>
              </div>
            </TooltipProvider>
            <Toaster richColors position="top-right" />
          </OverlayProvider>
        </AuthProvider>
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'TanStack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
      </QueryClientProvider>
    </>
  )
}
