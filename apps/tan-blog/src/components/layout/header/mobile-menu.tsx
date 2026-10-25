import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion"
import { useQuery } from '@tanstack/react-query'
import {
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from '@sao-blog/ui/components/drawer'
import { getNavLinks, isDocumentLink } from '@/config/menu'
import { orpc } from '@/lib/orpc'
import { siteName } from '@/lib/seo'
import { ChevronDownIcon, ChevronUpIcon, MenuIcon, SearchIcon, X } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { VisuallyHidden } from 'radix-ui'
import { m } from '#/paraglide/messages'
import { currentContentLocale } from '@/lib/content-locale'
import { useSearchStore } from '@/store/search-store'
import { openLoginDialog } from '@/store/login-dialog-store'

// 外部網址與 /rss.xml 這類伺服器路由用原生 <a>（新分頁），其餘走站內路由
const MenuLink = ({ href, ...props }: Omit<React.ComponentProps<'a'>, 'href'> & { href: string }) =>
    isDocumentLink(href)
        ? <a href={href} target="_blank" rel="noopener noreferrer" {...props} />
        : <Link to={href} {...props} />

const MobileMenu = ({ isMobile }: { isMobile: boolean }) => {
    const setSearchOpen = useSearchStore(state => state.setOpen)
    // 「更多」跟其他有子項的項目一樣放在折疊選單裡
    const mainLinks = getNavLinks()

    // 「文章」分類改為與電腦版一致，動態抓取真實分類清單，而非用設定檔寫死的清單
    // 僅在手機版時才啟用查詢，避免桌機版（此元件雖有渲染但被 CSS 隱藏）也發出多餘請求
    const { data: menuRes } = useQuery({
        ...orpc.menu.getMenu.queryOptions({ input: { locale: currentContentLocale() } }),
        enabled: isMobile,
    })
    const dynamicCategories =
        menuRes?.status === 'success'
            ? menuRes.data.categories.map(category => ({
                  href: `/categories/${category.slug}`,
                  text: category.name,
                  show: true,
              }))
            : null

    return (
        <div className="relative flex size-full items-center justify-center lg:hidden">
            <DrawerTrigger render={
                <button
                    aria-label={m.mobile_menu_open()}
                    className="flex items-center justify-center size-9 rounded-full text-foreground/80 hover:text-foreground hover:bg-foreground/10 transition-all duration-200"
                >
                    <MenuIcon className="size-5" />
                </button>
            } />

            <DrawerContent>
                <VisuallyHidden.Root>
                    <DrawerHeader>
                        <DrawerTitle>{m.mobile_menu_title()}</DrawerTitle>
                        <DrawerDescription>
                            {m.mobile_menu_description()}
                        </DrawerDescription>
                    </DrawerHeader>
                </VisuallyHidden.Root>

                {/* 頂部欄 */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <span
                        className="text-base text-foreground/80"
                        style={{ fontFamily: "'Noto Serif JP', serif", letterSpacing: '0.18em' }}
                    >
                        {siteName()}
                    </span>
                    <div className="flex items-center gap-1">
                        {/* 手機版搜尋入口：先關閉選單再開啟搜尋對話框 */}
                        <DrawerClose
                            onClick={() => setSearchOpen(true)}
                            render={
                                <button
                                    aria-label={m.search_open()}
                                    className="flex items-center justify-center size-7 rounded-full text-foreground/40 hover:text-foreground/75 hover:bg-foreground/10 transition-all duration-200"
                                >
                                    <SearchIcon className="size-3.5" />
                                </button>
                            }
                        />
                        <DrawerClose render={
                            <button
                                aria-label={m.mobile_menu_close()}
                                className="flex items-center justify-center size-7 rounded-full text-foreground/40 hover:text-foreground/75 hover:bg-foreground/10 transition-all duration-200"
                            >
                                <X className="size-3.5" />
                            </button>
                        } />
                    </div>
                </div>

                {/* 主導航 */}
                <div className="flex-1 overflow-y-auto">
                    <nav className="py-2">
                        <AccordionPrimitive.Root className="flex w-full flex-col">
                            {mainLinks.map((link, index) => {
                                const visibleChildren =
                                    link.card === 'posts' && dynamicCategories
                                        ? dynamicCategories
                                        : (link.children?.filter(c => c.show) ?? [])
                                const hasChildren = visibleChildren.length > 0

                                // 無子項：純連結列
                                if (!hasChildren) {
                                    return (
                                        <div key={index} className="flex items-center min-h-12 px-5">
                                            {link.href ? (
                                                <DrawerClose render={
                                                    <Link
                                                        to={link.href}
                                                        className="flex-1 text-base text-foreground/70 hover:text-foreground tracking-wide transition-colors duration-150"
                                                    >
                                                        {link.text}
                                                    </Link>
                                                } />
                                            ) : (
                                                <span className="flex-1 text-base text-foreground/70 tracking-wide">
                                                    {link.text}
                                                </span>
                                            )}
                                        </div>
                                    )
                                }

                                // 有子項：連結 + 獨立展開按鈕
                                return (
                                    <AccordionPrimitive.Item
                                        key={index}
                                        value={String(index)}
                                        className="flex flex-col"
                                    >
                                        {/* Header 行：左側連結、右側展開按鈕各自獨立；
                                            沒有自己頁面的項目（更多）整列都是展開按鈕 */}
                                        <AccordionPrimitive.Header className="flex items-center">
                                            {!link.href ? (
                                                <AccordionPrimitive.Trigger
                                                    className="group/trigger flex flex-1 items-center justify-between min-h-12 pl-5 text-base text-foreground/70 hover:text-foreground tracking-wide transition-colors duration-150 outline-none"
                                                >
                                                    {link.text}
                                                    <span className="flex items-center justify-center w-14 text-foreground/30">
                                                        <ChevronDownIcon className="size-3.5 pointer-events-none group-aria-expanded/trigger:hidden" />
                                                        <ChevronUpIcon className="size-3.5 pointer-events-none hidden group-aria-expanded/trigger:inline" />
                                                    </span>
                                                </AccordionPrimitive.Trigger>
                                            ) : (<>
                                            {/* 左側：點擊導航 */}
                                            {link.href ? (
                                                <DrawerClose render={
                                                    <Link
                                                        to={link.href}
                                                        className="flex-1 flex items-center min-h-12 px-5 text-base text-foreground/70 hover:text-foreground tracking-wide transition-colors duration-150"
                                                    >
                                                        {link.text}
                                                    </Link>
                                                } />
                                            ) : (
                                                <span className="flex-1 flex items-center min-h-12 px-5 text-base text-foreground/70 tracking-wide">
                                                    {link.text}
                                                </span>
                                            )}

                                            {/* 右側：獨立展開按鈕，足夠大的觸控區域 */}
                                            <AccordionPrimitive.Trigger
                                                aria-label={`展開 ${link.text}`}
                                                className="group/trigger flex items-center justify-center w-14 min-h-12 shrink-0 text-foreground/30 hover:text-foreground/60 hover:bg-foreground/5 transition-colors duration-150 outline-none"
                                            >
                                                <ChevronDownIcon className="size-3.5 pointer-events-none group-aria-expanded/trigger:hidden" />
                                                <ChevronUpIcon className="size-3.5 pointer-events-none hidden group-aria-expanded/trigger:inline" />
                                            </AccordionPrimitive.Trigger>
                                            </>)}
                                        </AccordionPrimitive.Header>

                                        {/* 子項目面板 */}
                                        <AccordionPrimitive.Panel className="overflow-hidden data-open:animate-accordion-down data-closed:animate-accordion-up">
                                            <div className="flex flex-col pb-1.5">
                                                {visibleChildren.map((child, childIndex) => (
                                                    <DrawerClose key={childIndex} render={
                                                        <MenuLink
                                                            href={child.href}
                                                            className="flex items-center pl-9 pr-5 min-h-10 text-base text-foreground/40 hover:text-foreground/70 transition-colors duration-150"
                                                        >
                                                            <span className="w-3 h-px bg-foreground/20 mr-3 shrink-0" />
                                                            {child.text}
                                                        </MenuLink>
                                                    } />
                                                ))}
                                            </div>
                                        </AccordionPrimitive.Panel>
                                    </AccordionPrimitive.Item>
                                )
                            })}
                        </AccordionPrimitive.Root>
                    </nav>

                </div>

                {/* 底部 — 讀者登錄 */}
                <div className="flex justify-end px-5 py-3 border-t border-border">
                    <DrawerClose
                        onClick={openLoginDialog}
                        className="text-xs text-red-500 hover:text-red-400 tracking-widest transition-colors duration-150"
                    >
                        {m.reader_login()}
                    </DrawerClose>
                </div>
            </DrawerContent>
        </div>
    )
}

export default MobileMenu
