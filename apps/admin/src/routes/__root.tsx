import { Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { AuthProvider } from "@/components/auth-provider"
import { TooltipProvider } from "@sao-blog/ui/components/tooltip"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@sao-blog/ui/components/sidebar"
import AppSidebar from "@/components/app-sidebar"
import { Separator } from "@sao-blog/ui/components/separator"
import { AdminBreadcrumb } from "@/components/layout/admin-breadcrumb"
import { env } from "@sao-blog/env/admin";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { OverlayProvider } from '@/components/overlay/overlay-provider'

import '@sao-blog/ui/globals.css'
import { authClient } from '@/lib/auth-client'
import { queryClient } from '@/utils/orpc'

export const Route = createRootRoute({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession()

    const isBlocked =
      !session ||
      session.user.role === "user" ||
      session.user.banned

    if (isBlocked) {
      const redirect = `${env.VITE_BLOG_URL}/login?redirect=${encodeURIComponent(
        window.location.pathname
      )}`

      window.location.href = redirect
      return // ⬅️ 重點：直接結束
    }

    return { session }
  },
  notFoundComponent: () => (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">找不到這個頁面</p>
      <a href="/admin" className="text-primary underline">回到首頁</a>
    </div>
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
                  <SidebarInset>
                    <header className="flex h-16 shrink-0 items-center gap-2 px-4">
                      <SidebarTrigger className="-ml-1" />
                      <Separator
                        orientation="vertical"
                        className="mr-2 data-[orientation=vertical]:h-4 data-vertical:self-center"
                      />
                      <AdminBreadcrumb />
                    </header>
                    <div className="p-4">
                      <Outlet />
                    </div>
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
