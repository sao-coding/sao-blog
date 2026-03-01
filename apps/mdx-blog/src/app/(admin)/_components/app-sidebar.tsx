import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
} from '@/components/ui/sidebar'
import { NavUser } from './nav-user'
import {
  ChartColumnBigIcon,
  Command,
  FolderIcon,
  Home,
  KeyRoundIcon,
  LayoutDashboardIcon,
  NotebookPenIcon,
  PlusIcon,
  Square,
  SquarePenIcon,
  TagIcon,
} from 'lucide-react'
import { cookies } from 'next/headers'
import Link from 'next/link'

const getUser = async () => {
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
  const session = await res.json()
  console.log({ session })
  return session
}

const AppSidebar = async () => {
  const user = await getUser()
  return (
    <Sidebar variant="floating" className="z-20">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" 
              render={
                <Link href="#">
                  <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                    <Command className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">blog</span>
                    <span className="truncate text-xs">Enterprise</span>
                  </div>
                </Link>
              } />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton render={
                <Link href="/admin/dashboard">
                  <LayoutDashboardIcon />
                  <span>儀表板</span>
                </Link>
              } />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton render={
                <Link href="/admin/posts">
                  <SquarePenIcon />
                  <span>文章</span>
                </Link>
              } />
              <SidebarMenuAction render={
                <Link href="/admin/posts/editor">
                  <PlusIcon /> <span className="sr-only">新增文章</span>
                </Link>
              } />
              <SidebarMenuSub className="ml-0 border-l-0 px-1.5">
                <SidebarMenuButton render={
                  <Link href="#">
                    <Home />
                    <span>子項目</span>
                  </Link>
                } />
              </SidebarMenuSub>
            </SidebarMenuItem>
          </SidebarMenu>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton render={
                <Link href="/admin/categories">
                  <FolderIcon />
                  <span>分類</span>
                </Link>
              } />
            </SidebarMenuItem>
          </SidebarMenu>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton render={
                <Link href="/admin/tags">
                  <TagIcon />
                  <span>標籤</span>
                </Link>
              } />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton render={
                <Link href="/admin/notes">
                  <NotebookPenIcon />
                  <span>日記</span>
                </Link>
              } />
              <SidebarMenuAction render={
                <Link href="/admin/notes/editor">
                  <PlusIcon /> <span className="sr-only">新增日記</span>
                </Link>
              } />
            </SidebarMenuItem>
          </SidebarMenu>
          {/* 專欄 */}
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton render={
                <Link href="/admin/topics">
                  <ChartColumnBigIcon />
                  <span>專欄</span>
                </Link>
              } />
              <SidebarMenuAction render={
                <Link href="/admin/topics/editor">
                  <PlusIcon /> <span className="sr-only">新增專欄</span>
                </Link>
              } />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        {/* apiKeys */}
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton render={
                <Link href="/admin/api-keys">
                  <KeyRoundIcon />
                  <span>API 金鑰</span>
                </Link>
              } />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user.user} />
      </SidebarFooter>
    </Sidebar>
  )
}

export default AppSidebar
