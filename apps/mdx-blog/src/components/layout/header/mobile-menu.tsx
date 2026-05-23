"use client"

import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion"
import {
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from '@/components/ui/drawer'
import { NAV_LINKS } from '@/config/menu'
import { ChevronDownIcon, ChevronUpIcon, MenuIcon, X } from 'lucide-react'
import Link from 'next/link'
import { VisuallyHidden } from 'radix-ui'

const MobileMenu = () => {
    const moreLinks = NAV_LINKS.find(link => !link.href && !link.icon)
    const mainLinks = NAV_LINKS.filter(link => link !== moreLinks)

    return (
        <div className="relative flex size-full items-center justify-center lg:hidden">
            <DrawerTrigger asChild>
                <button
                    aria-label="開啟選單"
                    className="flex items-center justify-center size-9 rounded-full text-neutral-300 hover:text-white hover:bg-white/10 transition-all duration-200"
                >
                    <MenuIcon className="size-5" />
                </button>
            </DrawerTrigger>

            <DrawerContent
                className="!rounded-none !border-0 !outline-none !shadow-none"
                style={{ background: '#111110' }}
            >
                <VisuallyHidden.Root>
                    <DrawerHeader>
                        <DrawerTitle>手機選單</DrawerTitle>
                        <DrawerDescription>
                            手機版選單，點擊選項以導航到對應頁面，或點擊空白處關閉選單。
                        </DrawerDescription>
                    </DrawerHeader>
                </VisuallyHidden.Root>

                {/* 頂部欄 */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                    <span
                        className="text-base text-white/80"
                        style={{ fontFamily: "'Noto Serif JP', serif", letterSpacing: '0.18em' }}
                    >
                        唯一のBlog
                    </span>
                    <DrawerClose asChild>
                        <button
                            aria-label="關閉選單"
                            className="flex items-center justify-center size-7 rounded-full text-white/40 hover:text-white/75 hover:bg-white/10 transition-all duration-200"
                        >
                            <X className="size-3.5" />
                        </button>
                    </DrawerClose>
                </div>

                {/* 主導航 */}
                <div className="flex-1 overflow-y-auto">
                    <nav className="py-2">
                        <AccordionPrimitive.Root className="flex w-full flex-col">
                            {mainLinks.map((link, index) => {
                                const visibleChildren = link.children?.filter(c => c.show) ?? []
                                const hasChildren = visibleChildren.length > 0

                                // 無子項：純連結列
                                if (!hasChildren) {
                                    return (
                                        <div key={index} className="flex items-center min-h-12 px-5">
                                            {link.href ? (
                                                <DrawerClose asChild>
                                                    <Link
                                                        href={link.href}
                                                        className="flex-1 text-base text-white/70 hover:text-white tracking-wide transition-colors duration-150"
                                                    >
                                                        {link.text}
                                                    </Link>
                                                </DrawerClose>
                                            ) : (
                                                <span className="flex-1 text-base text-white/70 tracking-wide">
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
                                        {/* Header 行：左側連結、右側展開按鈕各自獨立 */}
                                        <AccordionPrimitive.Header className="flex items-center">
                                            {/* 左側：點擊導航（若有 href） */}
                                            {link.href ? (
                                                <DrawerClose asChild>
                                                    <Link
                                                        href={link.href}
                                                        className="flex-1 flex items-center min-h-12 px-5 text-base text-white/70 hover:text-white tracking-wide transition-colors duration-150"
                                                    >
                                                        {link.text}
                                                    </Link>
                                                </DrawerClose>
                                            ) : (
                                                <span className="flex-1 flex items-center min-h-12 px-5 text-base text-white/70 tracking-wide">
                                                    {link.text}
                                                </span>
                                            )}

                                            {/* 右側：獨立展開按鈕，足夠大的觸控區域 */}
                                            <AccordionPrimitive.Trigger
                                                aria-label={`展開 ${link.text}`}
                                                className="group/trigger flex items-center justify-center w-14 min-h-12 shrink-0 text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors duration-150 outline-none"
                                            >
                                                <ChevronDownIcon className="size-3.5 pointer-events-none group-aria-expanded/trigger:hidden" />
                                                <ChevronUpIcon className="size-3.5 pointer-events-none hidden group-aria-expanded/trigger:inline" />
                                            </AccordionPrimitive.Trigger>
                                        </AccordionPrimitive.Header>

                                        {/* 子項目面板 */}
                                        <AccordionPrimitive.Panel className="overflow-hidden data-open:animate-accordion-down data-closed:animate-accordion-up">
                                            <div className="flex flex-col pb-1.5">
                                                {visibleChildren.map((child, childIndex) => (
                                                    <DrawerClose asChild key={childIndex}>
                                                        <Link
                                                            href={child.href}
                                                            className="flex items-center pl-9 pr-5 min-h-10 text-base text-white/40 hover:text-white/70 transition-colors duration-150"
                                                        >
                                                            <span className="w-3 h-px bg-white/20 mr-3 shrink-0" />
                                                            {child.text}
                                                        </Link>
                                                    </DrawerClose>
                                                ))}
                                            </div>
                                        </AccordionPrimitive.Panel>
                                    </AccordionPrimitive.Item>
                                )
                            })}
                        </AccordionPrimitive.Root>
                    </nav>

                    {/* 更多連結區塊 */}
                    {moreLinks?.children && (
                        <div className="px-5 pt-4 pb-6 border-t border-white/10">
                            <p className="text-base text-white/20 tracking-widest uppercase mb-3 select-none">
                                頁多
                            </p>
                            <div className="flex flex-wrap gap-x-5 gap-y-2.5">
                                {moreLinks.children
                                    .filter(child => child.show)
                                    .map((child, index) => (
                                        <DrawerClose asChild key={index}>
                                            <Link
                                                href={child.href}
                                                className="text-base text-white/40 hover:text-white/70 tracking-wide transition-colors duration-150"
                                            >
                                                {child.text}
                                            </Link>
                                        </DrawerClose>
                                    ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* 底部 — 讀者登錄 */}
                <div className="flex justify-end px-5 py-3 border-t border-white/10">
                    <DrawerClose asChild>
                        <Link
                            href="/login"
                            className="text-xs text-red-500 hover:text-red-400 tracking-widest transition-colors duration-150"
                        >
                            讀者登錄
                        </Link>
                    </DrawerClose>
                </div>
            </DrawerContent>
        </div>
    )
}

export default MobileMenu