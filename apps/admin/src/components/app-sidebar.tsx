import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@sao-blog/ui/components/sidebar'
import { PlusIcon } from 'lucide-react'
import { Link, useLocation, useRouteContext } from '@tanstack/react-router'
import { env } from '@sao-blog/env/admin'
import { NavUser } from './nav-user'
import { NAV_GROUPS, isNavActive } from '@/config/navigation'

const BLOG_HOST = new URL(env.VITE_BLOG_URL).host

const AppSidebar = () => {
  // __root 的 beforeLoad 在轉去登入頁時是直接 return，型別上 context 可能沒有 session
  const context = useRouteContext({ from: '__root__' })
  const session = context && 'session' in context ? context.session : undefined
  const { pathname } = useLocation()
  const { isMobile, setOpenMobile } = useSidebar()
  // 手機版側欄是覆蓋在畫面上的 Sheet，點完連結要收起來
  const closeOnMobile = () => isMobile && setOpenMobile(false)

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="後台首頁"
              render={
                <Link to="/" onClick={closeOnMobile}>
                  {/* 朱印：呼應前台信箋的落款 */}
                  <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-primary font-serif text-base font-bold leading-none text-primary-foreground shadow-sm">
                    箋
                  </div>
                  <div className="grid flex-1 text-left leading-tight">
                    <span className="truncate text-sm font-semibold">部落格後台</span>
                    <span className="truncate text-xs text-muted-foreground">{BLOG_HOST}</span>
                  </div>
                </Link>
              }
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    isActive={isNavActive(item, pathname)}
                    tooltip={item.title}
                    render={
                      <Link to={item.to} onClick={closeOnMobile}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    }
                  />
                  {item.create && (
                    <SidebarMenuAction
                      showOnHover
                      render={
                        <Link to={item.create.to} onClick={closeOnMobile} title={item.create.label}>
                          <PlusIcon />
                          <span className="sr-only">{item.create.label}</span>
                        </Link>
                      }
                    />
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        {/* 「前往網站」只放在頂部列右上角，不在這裡重複 */}
        {session && <NavUser user={session.user} />}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

export default AppSidebar
