import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import AppSidebar from '@/app/(admin)/_components/app-sidebar'
import { Separator } from '@/components/ui/separator'
import { AdminBreadcrumb } from './_components/layout/admin-breadcrumb'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Script from 'next/script'

const getAuth = async () => {
  const cookieStore = await cookies()
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/auth/get-session`,
    {
      headers: {
        cookie: cookieStore.toString(), // Next.js 15 可用 cookies() 取得
      },
      cache: 'no-store',
    }
  )
  return res.json()
}

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await getAuth()
  if (!session?.user) {
    redirect('/login')
  }
  return (
    <div className="admin">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <AdminBreadcrumb />
          </header>
          <div className="p-4">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
