"use client"

import {
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from '@/components/ui/drawer'
import { NAV_LINKS } from '@/config/menu';
import { MenuIcon } from 'lucide-react';
import Link from 'next/link';
import { VisuallyHidden } from 'radix-ui';

const MobileMenu = () => {
    return (
        <div className="relative flex size-full items-center justify-center lg:hidden">
            <DrawerTrigger>
                <MenuIcon />
            </DrawerTrigger>
            <DrawerContent className='data-[vaul-drawer-direction=bottom]:rounded-t-3xl'>
                <VisuallyHidden.Root>
                    <DrawerHeader>
                        <DrawerTitle>手機選單</DrawerTitle>
                        <DrawerDescription>
                            手機版選單，點擊選項以導航到對應頁面，或點擊空白處關閉選單。
                        </DrawerDescription>
                    </DrawerHeader>
                </VisuallyHidden.Root>
                {/* 主導航選單 */}
                <div className="flex flex-col p-4 space-y-4 mt-20">
                    {NAV_LINKS.map((link, index) => (
                        <section key={index}>
                            {link.href ? (
                                <div className="flex items-center space-x-2 py-2 text-lg">
                                    {link.icon && <link.icon className="size-5 mr-2" />}
                                    <DrawerClose asChild>
                                        <Link
                                            href={link.href}
                                            className="text-lg font-medium leading-none"
                                        >
                                            <h2>{link.text}</h2>
                                        </Link>
                                    </DrawerClose>
                                </div>
                            ) : (
                                <p className="text-lg font-medium leading-none">
                                    {link.text}
                                </p>
                            )}
                            {link.children && (
                                <div className="pl-4 p-2 flex flex-col space-y-2">
                                    {link.children
                                        .filter((child) => child.show)
                                        .map((child, childIndex) => (
                                            <DrawerClose asChild key={childIndex}>
                                                <Link href={child.href}>{child.text}</Link>
                                            </DrawerClose>
                                        ))}
                                </div>
                            )}
                        </section>
                    ))}
                </div>
            </DrawerContent>
        </div>
    )
}

export default MobileMenu;