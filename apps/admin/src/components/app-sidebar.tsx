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
} from '@sao-blog/ui/components/sidebar'
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
import { Link, useRouteContext } from '@tanstack/react-router'
import { useAuth } from '@/components/auth-provider'

const AppSidebar = () => {
  const { session } = useRouteContext({ from: '__root__' })
  console.log('Session in AppSidebar:', session) // 添加日志以调试会话数据

  return (
    <Sidebar variant="floating" className="z-20">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" 
              render={
                <Link to="/">
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
                <Link to="/">
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
                <Link to="/posts">
                  <SquarePenIcon />
                  <span>文章</span>
                </Link>
              } />
              <SidebarMenuAction render={
                <Link to="/posts/editor">
                  <PlusIcon /> <span className="sr-only">新增文章</span>
                </Link>
              } />
              <SidebarMenuSub className="ml-0 border-l-0 px-1.5">
                <SidebarMenuButton render={
                  <Link to="#">
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
                <Link to="/admin/categories">
                  <FolderIcon />
                  <span>分類</span>
                </Link>
              } />
            </SidebarMenuItem>
          </SidebarMenu>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton render={
                <Link to="/admin/tags">
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
                <Link to="/admin/notes">
                  <NotebookPenIcon />
                  <span>日記</span>
                </Link>
              } />
              <SidebarMenuAction render={
                <Link to="/admin/notes/editor">
                  <PlusIcon /> <span className="sr-only">新增日記</span>
                </Link>
              } />
            </SidebarMenuItem>
          </SidebarMenu>
          {/* 專欄 */}
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton render={
                <Link to="/admin/topics">
                  <ChartColumnBigIcon />
                  <span>專欄</span>
                </Link>
              } />
              <SidebarMenuAction render={
                <Link to="/admin/topics/editor">
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
                <Link to="/admin/api-keys">
                  <KeyRoundIcon />
                  <span>API 金鑰</span>
                </Link>
              } />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={session.user} />
      </SidebarFooter>
    </Sidebar>
  )
}

export default AppSidebar
