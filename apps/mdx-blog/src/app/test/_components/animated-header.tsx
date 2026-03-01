/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import type React from 'react'
import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  motion as m,
  LayoutGroup,
  useMotionTemplate,
  useMotionValue,
  AnimatePresence,
} from 'motion/react'
import { NAV_LINKS } from '@/config/menu'
import { cn } from '@/lib/utils'

interface AnimatedHeaderProps {
  iconLayout?: boolean
  className?: string
}

const AnimatedHeader = ({
  iconLayout = true,
  className,
}: AnimatedHeaderProps) => {
  const pathname = usePathname()
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  const headerRef = useRef<HTMLElement>(null)
  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 滑鼠位置追蹤
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const entryX = useMotionValue(0)
  const entryY = useMotionValue(0)
  const radius = useMotionValue(0)

  // 處理導航項目顯示邏輯
  const getNavItemsToShow = () => {
    const itemsToShow: Array<{
      icon: any
      href: string
      text: string
      isChild: boolean
      parentIcon?: any
      childHref?: string
      // 添加一個穩定的 key 來避免動畫重新觸發
      stableKey: string
    }> = []

    NAV_LINKS.forEach((link) => {
      // 檢查是否有子項目被激活且需要顯示
      const activeChild = link.children?.find(
        (child) => child.show && pathname === child.href
      )

      if (activeChild) {
        // 如果有激活的子項目，顯示子項目
        itemsToShow.push({
          icon: activeChild.icon || link.icon,
          href: link.href || activeChild.href,
          text: activeChild.text,
          isChild: true,
          parentIcon: link.icon,
          childHref: activeChild.href,
          // 使用父項目的 href 作為穩定的 key
          stableKey: link.href || activeChild.href,
        })
      } else {
        // 否則顯示父項目
        itemsToShow.push({
          icon: link.icon,
          href: link.href || '#',
          text: link.text,
          isChild: false,
          // 使用自身的 href 作為穩定的 key
          stableKey: link.href || link.text.replace(/\s+/g, '-').toLowerCase(),
        })
      }
    })

    return itemsToShow
  }

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // 清理 timeout
  useEffect(() => {
    return () => {
      if (dropdownTimeoutRef.current) {
        clearTimeout(dropdownTimeoutRef.current)
      }
    }
  }, [])

  const shouldAnimate = iconLayout && !prefersReducedMotion

  const spotlightBackground = useMotionTemplate`radial-gradient(ellipse 200px 100px at ${mouseX}px ${mouseY}px, rgba(14, 165, 233, 0.15) 0%, rgba(14, 165, 233, 0.08) 40%, transparent 70%)`

  // 處理滑鼠移動事件
  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!shouldAnimate) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    mouseX.set(x)
    mouseY.set(y)
    radius.set(Math.hypot(rect.width, rect.height) / 2.5)
  }

  // 處理滑鼠進入事件
  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    if (!shouldAnimate) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    entryX.set(x)
    entryY.set(y)
    mouseX.set(x)
    mouseY.set(y)
    radius.set(Math.hypot(rect.width, rect.height) / 2)

    setIsHovered(true)
  }

  // 處理滑鼠離開事件
  const handleMouseLeave = () => {
    if (shouldAnimate) {
      setIsHovered(false)
    }
  }

  // 下拉選單處理邏輯
  const handleNavItemMouseEnter = (linkHref: string, hasChildren: boolean) => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current)
      dropdownTimeoutRef.current = null
    }

    setHoveredItem(linkHref)

    if (hasChildren) {
      setOpenDropdown(linkHref)
    } else {
      setOpenDropdown(null)
    }
  }

  const handleNavItemMouseLeave = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setHoveredItem(null)
      setOpenDropdown(null)
    }, 100)
  }

  const handleDropdownMouseEnter = () => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current)
      dropdownTimeoutRef.current = null
    }
  }

  const handleDropdownMouseLeave = () => {
    setHoveredItem(null)
    setOpenDropdown(null)
  }

  return (
    <header
      ref={headerRef}
      className={cn(
        'relative inset-x-0 top-4 z-10 mx-auto hidden h-9 max-w-fit items-center justify-between rounded-full bg-gray-900/95 backdrop-blur-md border border-gray-700/50 px-4 py-2 md:flex shadow-lg overflow-visible group',
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <m.div
        className="pointer-events-none absolute -inset-px rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: spotlightBackground }}
        aria-hidden="true"
      />

      <LayoutGroup>
        <nav className="flex items-center relative">
          {/* 修改：移除 AnimatePresence，直接使用 map 渲染 */}
          {getNavItemsToShow().map((item) => {
            const isActive = item.isChild
              ? pathname === item.childHref
              : pathname === item.href

            const originalLink = NAV_LINKS.find(
              (link) => link.href === item.href
            )
            const hasChildren = Boolean(
              originalLink?.children && originalLink.children.length > 0
            )
            const isDropdownOpen = openDropdown === item.href
            const isHovered = hoveredItem === item.href

            return (
              <m.div
                // 使用穩定的 key 避免重新創建組件
                key={item.stableKey}
                layout={shouldAnimate}
                // 移除進入/退出動畫，只保留 layout 動畫
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 30,
                  mass: 0.8,
                }}
                className="relative"
                onMouseEnter={() =>
                  handleNavItemMouseEnter(item.href, hasChildren || false)
                }
                onMouseLeave={handleNavItemMouseLeave}
              >
                <Link
                  href={item.href}
                  title={item.text}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'relative flex items-center justify-center rounded-full px-3 py-2 transition-all duration-200 group/item',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                    isActive ? 'text-teal-400' : 'text-gray-300',
                    isHovered && 'text-teal-300'
                  )}
                >
                  {/* 動態內容容器 */}
                  <div className="flex items-center">
                    {/* 圖標 */}
                    {/* {isActive && shouldAnimate && (
                      <m.div
                        layoutId="header-menu-icon"
                        className="flex items-center justify-center w-5"
                        transition={{
                          type: "spring",
                          stiffness: 350,
                          damping: 28,
                          mass: 0.6,
                        }}
                        style={{ willChange: "transform" }}
                        aria-hidden="true"
                      >
                        <item.icon size={16} className="text-teal-400" />
                      </m.div>
                    )} */}
                    {isActive && shouldAnimate && (
                      <m.div
                        layoutId="header-menu-icon"
                        className="flex items-center justify-center w-5 relative"
                        transition={{
                          type: 'spring',
                          stiffness: 350,
                          damping: 28,
                          mass: 0.6,
                        }}
                        style={{ willChange: 'transform' }}
                        aria-hidden="true"
                      >
                        <AnimatePresence mode="wait">
                          <m.div
                            key={`icon-${
                              item.isChild ? item.childHref : item.href
                            }`}
                            initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            exit={{ opacity: 0, scale: 0.5, rotate: 180 }}
                            transition={{
                              duration: 0.3,
                              ease: 'easeInOut',
                            }}
                            className="absolute inset-0 flex items-center justify-center"
                          >
                            <item.icon size={16} className="text-teal-400" />
                          </m.div>
                        </AnimatePresence>
                      </m.div>
                    )}

                    {isActive && !shouldAnimate && (
                      <div className="flex items-center justify-center w-5">
                        <item.icon size={16} className="text-teal-400" />
                      </div>
                    )}

                    {/* 文字 - 添加 key 確保內容更新 */}
                    <m.span
                      key={`text-${item.stableKey}-${item.isChild}`}
                      layout={shouldAnimate}
                      transition={{
                        type: 'spring',
                        stiffness: 350,
                        damping: 28,
                        mass: 0.6,
                      }}
                      className="text-sm font-medium whitespace-nowrap hover:text-teal-400"
                    >
                      {item.text}
                    </m.span>
                  </div>

                  {/* 活躍項目的底部橫線 */}
                  {isActive && shouldAnimate && (
                    <m.span
                      layoutId="active-nav-underline"
                      className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-teal-400 to-transparent pointer-events-none rounded-full"
                      transition={{
                        type: 'spring',
                        stiffness: 350,
                        damping: 28,
                        mass: 0.6,
                      }}
                      style={{ willChange: 'transform' }}
                      aria-hidden="true"
                    />
                  )}

                  {!shouldAnimate && (
                    <span
                      className={cn(
                        'absolute inset-x-0 -bottom-1 h-0.5 pointer-events-none rounded-full transition-all duration-300 ease-out',
                        'bg-gradient-to-r from-transparent via-teal-400 to-transparent',
                        isActive
                          ? 'opacity-100 scale-x-100'
                          : 'opacity-0 scale-x-0'
                      )}
                      aria-hidden="true"
                    />
                  )}
                </Link>

                {/* 下拉選單 */}
                {hasChildren && originalLink && (
                  <AnimatePresence>
                    {isDropdownOpen && (
                      <m.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{
                          type: 'spring',
                          stiffness: 500,
                          damping: 25,
                          mass: 0.8,
                        }}
                        className="absolute top-full left-1/2 transform -translate-x-1/2 mt-3 w-max bg-gray-800/95 backdrop-blur-md border border-gray-600/50 rounded-lg shadow-xl overflow-hidden z-50"
                        onMouseEnter={handleDropdownMouseEnter}
                        onMouseLeave={handleDropdownMouseLeave}
                      >
                        <div className="absolute -top-2 left-0 right-0 h-3 bg-transparent" />

                        <div className="py-2">
                          {originalLink.children?.map((child) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              className="block px-4 py-2 text-sm text-gray-300 hover:text-teal-400 hover:bg-gray-700/50 transition-all duration-200"
                            >
                              {child.icon && (
                                <child.icon
                                  size={14}
                                  className="inline-block mr-2"
                                />
                              )}
                              {child.text}
                            </Link>
                          ))}
                        </div>
                      </m.div>
                    )}
                  </AnimatePresence>
                )}
              </m.div>
            )
          })}
        </nav>
      </LayoutGroup>
    </header>
  )
}

export default AnimatedHeader
