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
import { Icon } from '@tabler/icons-react'

interface AnimatedHeaderProps {
  iconLayout?: boolean
  className?: string
  variant?: 'default' | 'integrated'
  id: string // 必須傳入的唯一 id，用於生成唯一的 layoutId
}

const Nav = ({
  iconLayout = true,
  className,
  variant = 'default',
  id,
}: AnimatedHeaderProps) => {
  const pathname = usePathname()
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  const navRef = useRef<HTMLElement>(null)
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
      icon?: Icon
      href?: string
      text: string
      isChild: boolean
      parentIcon?: Icon
      childHref?: string
      hasChildren: boolean
      active?: boolean
      // 添加一個穩定的 key 來避免動畫重新觸發
      stableKey: string
      // 添加 parentIndex 來幫助查找原始項目
      parentIndex: number
    }> = []

    NAV_LINKS.forEach((link, index) => {
      // 檢查是否有子項目被激活且需要顯示（僅精確比對子項目）
      const activeChild = link.children?.find(
        (child) => child.show && pathname === child.href
      )

      // 檢查父路由是否為當前路徑的前綴（例如 /posts/slug 或 /notes/:id）
      const isParentActive =
        Boolean(link.href) &&
        (pathname === link.href ||
          (link.href !== '/' && pathname.startsWith(`${link.href}/`)))

      if (activeChild) {
        // 如果有精確匹配的子項目，顯示子項目（並標記為 active）
        itemsToShow.push({
          icon: activeChild.icon || link.icon,
          href: link.href,
          text: activeChild.text,
          isChild: true,
          parentIcon: link.icon,
          childHref: activeChild.href,
          hasChildren: Boolean(link.children && link.children.length > 0),
          // 使用父項目的 index 作為穩定的 key
          stableKey: `parent-${index}`,
          parentIndex: index,
          active: true,
        })
      } else {
        // 否則顯示父項目；如果 pathname 為父路由的前綴則標記為 active
        itemsToShow.push({
          icon: link.icon,
          href: link.href,
          text: link.text,
          isChild: false,
          hasChildren: Boolean(link.children && link.children.length > 0),
          // 使用自身的 href 或 index 作為穩定的 key
          stableKey: link.href || `parent-${index}`,
          parentIndex: index,
          active: isParentActive,
        })
      }
    })

    return itemsToShow
  }

  useEffect(() => {
    // 路徑改變時，關閉所有下拉選單
    setOpenDropdown(null)
    setHoveredItem(null)
  }, [pathname])

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
  }

  // 下拉選單處理邏輯
  const handleNavItemMouseEnter = (linkKey: string, hasChildren: boolean) => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current)
      dropdownTimeoutRef.current = null
    }

    setHoveredItem(linkKey)

    if (hasChildren) {
      setOpenDropdown(linkKey)
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
    <nav
      ref={navRef}
      className={cn(
        'relative mx-auto h-9 max-w-fit items-center justify-between rounded-full border px-4 md:flex overflow-visible group transition-all duration-100',
        variant === 'integrated'
          ? 'bg-transparent border-transparent shadow-none'
          : 'bg-gray-900/95 backdrop-blur-md border-gray-700/50 shadow-lg',
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
    >
      <m.div
        className="pointer-events-none absolute -inset-px rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: spotlightBackground }}
        aria-hidden="true"
      />

      <LayoutGroup>
        <div className="flex items-center relative">
          {getNavItemsToShow().map((item) => {
            // 使用在 getNavItemsToShow 中計算的 active 標記，支援子項目精確匹配與父路由前綴匹配
            const isActive = Boolean(item.active)

            // 使用 parentIndex 來正確查找原始項目
            const originalLink = NAV_LINKS[item.parentIndex]
            const isDropdownOpen = openDropdown === item.stableKey
            const isHovered = hoveredItem === item.stableKey

            // 如果沒有 href，渲染為 button 而不是 Link
            const content = (
              <>
                {/* 動態內容容器 */}
                <div className="flex items-center">
                  {/* 圖標 */}
                  {isActive && shouldAnimate && item.icon && (
                    <m.div
                      layoutId={`header-menu-icon-${id}`}
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
                            item.isChild ? item.childHref : item.stableKey
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

                  {isActive && !shouldAnimate && item.icon && (
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
                    className={cn(
                      'text-sm font-medium whitespace-nowrap hover:text-teal-400',
                      isActive ? 'text-teal-400' : 'text-gray-300'
                    )}
                  >
                    {item.text}
                  </m.span>
                </div>

                {/* 活躍項目的底部橫線 */}
                {isActive && shouldAnimate && (
                  <m.span
                    layoutId={`active-nav-underline-${id}`}
                    className="absolute inset-x-0 bottom-px h-px bg-gradient-to-r from-transparent via-teal-400 to-transparent pointer-events-none rounded-full"
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
                      'absolute inset-x-0 bottom-px h-0.5 pointer-events-none rounded-full transition-all duration-300 ease-out',
                      'bg-gradient-to-r from-transparent via-teal-400 to-transparent',
                      isActive
                        ? 'opacity-100 scale-x-100'
                        : 'opacity-0 scale-x-0'
                    )}
                    aria-hidden="true"
                  />
                )}
              </>
            )

            return (
              <m.div
                key={item.stableKey}
                layout={shouldAnimate}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 30,
                  mass: 0.8,
                }}
                className="relative"
                onMouseEnter={() =>
                  handleNavItemMouseEnter(item.stableKey, item.hasChildren)
                }
                onMouseLeave={handleNavItemMouseLeave}
              >
                {item.href ? (
                  <Link
                    href={item.href}
                    title={item.text}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'relative flex items-center justify-center rounded-full px-4 py-2 transition-all duration-200 group/item',
                      'focus-visible:outline-0',
                      isHovered && 'text-teal-300'
                    )}
                  >
                    {content}
                  </Link>
                ) : (
                  <button
                    type="button"
                    title={item.text}
                    className={cn(
                      'relative flex items-center justify-center rounded-full px-4 py-2 transition-all duration-200 group/item cursor-pointer',
                      'text-gray-300',
                      'focus-visible:outline-0',
                      isHovered && 'text-teal-300'
                    )}
                  >
                    {content}
                  </button>
                )}

                {/* 下拉選單 */}
                {item.hasChildren && originalLink && (
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
                              onClick={() => {
                                if (dropdownTimeoutRef.current) {
                                  clearTimeout(dropdownTimeoutRef.current)
                                  dropdownTimeoutRef.current = null
                                }
                                setOpenDropdown(null)
                                setHoveredItem(null)
                              }}
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
        </div>
      </LayoutGroup>
    </nav>
  )
}

export default Nav
