// 階段 9 原型：墨帶＋燈（站主選了方向一的 nav、方向三的燈，2026-10-27）
//   左：站主落款——頭像右下一盞小燈（有在活動就點著）＋一行「在用／在聽」
//   中：一筆乾筆墨帶托著導覽；目前所在是一盞燈，換頁時順水漂到新的那一項；滑過那一項墨變濕
//       下拉是一張邊緣化開的紙，燈光從上面落在滑過那一項的位置；內容一行一行浮上來
//   右：「尋」與讀者登錄，都寫成字
// 站主選定後併進正式的 header，這個資料夾刪掉。
import type React from 'react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { useLocation } from '@tanstack/react-router'
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from 'motion/react'
import { SearchIcon, X } from 'lucide-react'
import { m } from '#/paraglide/messages'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'
import { useScrollStore } from '@/store/scroll-store'
import { useSearchStore } from '@/store/search-store'
import { openLoginDialog } from '@/store/login-dialog-store'
import { authClient } from '@/lib/auth-client'
import { LoginDialog } from '@/components/login-dialog'
import HeaderTitle from '../header-title'
import UserButton from '../user-button'
import { SearchCommand } from '../search-command'
import { isDetailPath } from '../header'
import { useNavModel, type ProtoItem } from './nav-model'
import { BrushRule, MenuGlyph, ProtoLink, focusRing, protoText } from './proto-parts'
import { ActivityLine, useOwnerActivity } from './owner-mark'
import { siteName } from '@/lib/seo'
import { LampCard } from './proto-cards'
import './proto.css'

const SCROLL_THRESHOLD = 50
// 燈順水漂：慢一點、不回彈
const DRIFT = { type: 'spring', stiffness: 110, damping: 20, mass: 1 } as const

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

export default function ProtoHeader() {
  const pathname = useLocation({ select: (l) => l.pathname })
  const isMobile = useIsMobile(1024)
  const isDetail = isDetailPath(pathname)
  const isScrolled = useScrollStore((s) => s.scrollTop > SCROLL_THRESHOLD)
  // 文章／日記內頁往下讀時，導覽讓位給標題；一往上捲就回來
  const showTitle = useScrollStore((s) => isDetail && s.scrollTop > SCROLL_THRESHOLD && s.direction !== 'up')
  const items = useNavModel()
  const activity = useOwnerActivity()

  return (
    <MotionConfig reducedMotion="user">
      {/* 下拉的紙邊與墨帶邊緣用的濾鏡：水把邊化開 */}
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <filter id="nav-rough" x="-5%" y="-10%" width="110%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035 0.06" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="5" />
        </filter>
      </svg>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 h-[4.5rem] transition-colors duration-300 [view-transition-name:site-header]',
          isScrolled && 'bg-background'
        )}
      >
        <BrushRule
          className={cn(
            'absolute inset-x-0 -bottom-1 text-foreground/15 transition-opacity duration-300',
            isScrolled ? 'opacity-100' : 'opacity-0'
          )}
        />
        <div className="mx-auto grid h-full max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-3 lg:px-8">
          {/* 左：站主 */}
          <div className="flex min-w-0 items-center gap-3">
            {isMobile ? (
              <MobileSheet items={items} activity={activity} />
            ) : (
              // 不放頭像（站主：沒什麼用），左邊只寫站主現在在做什麼
              <ActivityLine activity={activity} />
            )}
          </div>

          {/* 中：導覽 */}
          <div className={cn('flex h-full items-center justify-center transition-opacity duration-200', showTitle && 'pointer-events-none opacity-0')}>
            {isMobile ? (
              <ActivityLine activity={activity} compact />
            ) : (
              <InkBandNav items={items} activity={activity} integrated={isScrolled} />
            )}
          </div>

          {/* 右：尋、讀者 */}
          <div className="flex items-center justify-end gap-4">
            <SearchEntry compact={isMobile} />
            <span aria-hidden="true" className="h-3.5 w-px bg-foreground/15" />
            <ReaderEntry />
          </div>
        </div>

        {/* 內頁往下讀時的標題 */}
        <div className="pointer-events-none absolute inset-y-0 left-1/2 flex w-[min(42rem,62vw)] -translate-x-1/2 items-center">
          <HeaderTitle showBackground={showTitle} />
        </div>
      </header>
      {/* 搜尋對話框與 ⌘K 還是用原本的元件，只是不要它的按鈕 */}
      <span className="hidden">
        <SearchCommand />
      </span>
      <LoginDialog />
    </MotionConfig>
  )
}

// ─── 中：墨帶 ───────────────────────────────────────────

function InkBand({ hidden }: { hidden: boolean }) {
  return (
    <svg
      viewBox="0 0 600 48"
      preserveAspectRatio="none"
      className={cn('pointer-events-none absolute -inset-x-6 -inset-y-1 h-[calc(100%+0.5rem)] w-[calc(100%+3rem)] transition-opacity duration-300', hidden && 'opacity-0')}
      aria-hidden="true"
    >
      <g filter="url(#nav-rough)">
        {/* 帶身：一筆淡墨——左邊起筆藏鋒（圓、鈍），右邊出鋒（筆毛分岔、收尖）。
            紙色裡帶一點墨，擋住後面的山水讓字讀得清楚 */}
        <path
          d="M10 24 C 10 14, 22 10, 42 10 C 160 8, 360 9, 520 12 C 560 13, 585 16, 598 20 C 578 22, 562 25, 592 29 C 562 35, 520 38, 470 38 C 330 40, 160 41, 42 39 C 20 38, 10 33, 10 24 Z"
          fill="color-mix(in oklab, color-mix(in oklab, var(--foreground) 7%, var(--background)) 86%, transparent)"
        />
        {/* 起筆處積的墨 */}
        <path d="M16 16 C 10 23, 12 32, 24 37" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" className="text-foreground/[0.12]" />
        {/* 飛白：沿著筆走的乾筆絲，右邊拖出帶身外 */}
        <g fill="none" stroke="currentColor" strokeLinecap="round" className="text-foreground/[0.09]">
          <path vectorEffect="non-scaling-stroke" strokeWidth="1.4" d="M40 13 C 200 11, 420 12, 600 18" />
          <path vectorEffect="non-scaling-stroke" strokeWidth="1" d="M60 36 C 230 38, 440 37, 600 30" />
          <path vectorEffect="non-scaling-stroke" strokeWidth="0.8" d="M300 21 C 420 20, 520 22, 596 24" />
        </g>
      </g>
    </svg>
  )
}

function InkBandNav({ items, activity, integrated }: { items: ProtoItem[]; activity: ReturnType<typeof useOwnerActivity>; integrated: boolean }) {
  const pathname = useLocation({ select: (l) => l.pathname })
  const [open, setOpen] = useState<string | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef(new Map<string, HTMLElement>())
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)

  useEffect(() => setOpen(null), [pathname])
  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }, [])

  // 換一張卡片時，在畫出來之前先量好尺寸，紙才會平順地變形
  useIsoLayoutEffect(() => {
    const el = measureRef.current
    if (!open || !el) return
    setSize({ width: el.offsetWidth, height: el.offsetHeight })
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => setSize({ width: el.offsetWidth, height: el.offsetHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [open])

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = null
  }
  const closeSoon = () => {
    cancelClose()
    closeTimer.current = setTimeout(() => setOpen(null), 120)
  }
  const focusCard = () => requestAnimationFrame(() => dropRef.current?.querySelector<HTMLElement>('a,button')?.focus())

  const openItem = items.find((i) => i.key === open)
  const anchor = open ? itemRefs.current.get(open) : null
  const centerX = anchor ? anchor.offsetLeft + anchor.offsetWidth / 2 : 0
  const left = size ? centerX - size.width / 2 : centerX

  return (
    <div
      ref={wrapRef}
      className="relative flex h-10 items-center"
      onMouseLeave={closeSoon}
      onBlur={(e) => {
        if (!wrapRef.current?.contains(e.relatedTarget as Node)) setOpen(null)
      }}
    >
      <InkBand hidden={integrated} />
      <nav aria-label={m.mobile_menu_title()} className="relative">
        <LayoutGroup id="ink-band">
          <ul className="flex items-center">
            {items.map((item) => {
              const child = item.children.find((c) => c.active)
              // 在子頁時直接寫子頁的名字（例如「程式設計」），一眼看出在哪
              const text = child && item.card !== 'more' ? child.text : item.text
              const isOpen = open === item.key
              const cls = cn(
                'nav-ink relative flex h-10 items-center px-4 font-wenkai text-[15px] tracking-[0.18em]',
                focusRing,
                item.active ? 'text-foreground' : 'text-foreground/60'
              )
              const handlers = {
                ref: (el: HTMLElement | null) => {
                  if (el) itemRefs.current.set(item.key, el)
                  else itemRefs.current.delete(item.key)
                },
                'data-open': isOpen ? '' : undefined,
                onMouseEnter: () => {
                  cancelClose()
                  setOpen(item.card ? item.key : null)
                },
                onFocus: () => setOpen(item.card ? item.key : null),
                onKeyDown: (e: React.KeyboardEvent) => {
                  if (e.key === 'ArrowDown' && item.card) {
                    e.preventDefault()
                    setOpen(item.key)
                    focusCard()
                  }
                  if (e.key === 'Escape') setOpen(null)
                },
              }
              const content = (
                <>
                  {item.active && <motion.span layoutId="nav-lantern" className="nav-lantern" transition={DRIFT} aria-hidden="true" />}
                  <span className="relative">{text}</span>
                </>
              )
              return (
                <li key={item.key}>
                  {item.href ? (
                    <ProtoLink href={item.href} aria-current={item.active ? 'page' : undefined} className={cls} {...handlers}>
                      {content}
                    </ProtoLink>
                  ) : (
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      className={cls}
                      {...handlers}
                      onClick={() => {
                        setOpen(isOpen ? null : item.key)
                        if (!isOpen) focusCard()
                      }}
                    >
                      {content}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </LayoutGroup>
      </nav>

      {/* 共用的一張紙：換項目時紙跟著變形、燈光移過去，內容一行一行浮上來 */}
      <AnimatePresence>
        {openItem?.card && (
          <motion.div
            ref={dropRef}
            key="lamp-paper"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0, left, width: size?.width, height: size?.height }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.8 }}
            className="absolute top-full z-50 mt-3"
            onMouseEnter={cancelClose}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setOpen(null)
                anchor?.focus()
              }
            }}
          >
            <span className="nav-paper-rim" aria-hidden="true" />
            <span className="nav-paper" aria-hidden="true" />
            <div className="absolute inset-0 overflow-hidden">
              <motion.span className="nav-spill" animate={{ left: centerX - left }} transition={DRIFT} aria-hidden="true" />
            </div>
            <div ref={measureRef} className="relative w-max">
              <div key={openItem.card}>
                <LampCard card={openItem.card} activity={activity} onNavigate={() => setOpen(null)} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── 右：尋、讀者 ───────────────────────────────────────

function SearchEntry({ compact }: { compact: boolean }) {
  const setOpen = useSearchStore((s) => s.setOpen)
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={m.search_open()}
      className={cn('nav-ink flex items-center gap-2 font-wenkai text-[15px] tracking-[0.2em] text-foreground/60', focusRing)}
    >
      {compact ? (
        <SearchIcon className="size-4" strokeWidth={1.6} />
      ) : (
        <>
          {protoText('search')}
          <kbd className="rounded-[2px] border border-rule px-1 font-mono text-[10px] tracking-normal text-foreground/40">Ctrl K</kbd>
        </>
      )}
    </button>
  )
}

function ReaderEntry() {
  const { data: session } = authClient.useSession()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (mounted && session?.user) return <UserButton />
  return (
    <button type="button" onClick={openLoginDialog} className={cn('nav-ink font-wenkai text-[15px] tracking-[0.2em] text-foreground/60', focusRing)}>
      {m.reader_login()}
    </button>
  )
}

// ─── 手機：一張紙從上面展開 ─────────────────────────────

function MobileSheet({ items, activity }: { items: ProtoItem[]; activity: ReturnType<typeof useOwnerActivity> }) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        render={
          <button type="button" aria-label={m.mobile_menu_open()} className={cn('flex size-10 items-center justify-center text-foreground/70', focusRing)}>
            <MenuGlyph />
          </button>
        }
      />
      <Dialog.Portal>
        <Dialog.Backdrop className="proto-fade fixed inset-0 z-[60] bg-foreground/10" />
        <Dialog.Popup className="proto-unroll fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-background outline-none">
          <div className="flex items-center gap-3 px-5 pt-5">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="font-wenkai text-base tracking-[0.3em]">{siteName()}</Dialog.Title>
              <ActivityLine activity={activity} className="mt-1" />
            </div>
            <Dialog.Close aria-label={m.mobile_menu_close()} className={cn('flex size-9 items-center justify-center text-foreground/50', focusRing)}>
              <X className="size-4" />
            </Dialog.Close>
          </div>
          <BrushRule className="mt-4 px-5 text-foreground/15" />

          <nav aria-label={m.mobile_menu_title()} className="flex-1 px-8 py-6">
            <ul className="flex flex-col gap-6">
              {items.map((item, i) => (
                <li key={item.key} className="proto-rise" style={{ '--i': i } as React.CSSProperties}>
                  {item.href ? (
                    <ProtoLink
                      href={item.href}
                      onClick={close}
                      aria-current={item.active ? 'page' : undefined}
                      className={cn('relative inline-block py-1 font-wenkai text-2xl tracking-[0.24em]', focusRing, item.active ? 'text-foreground' : 'text-foreground/65')}
                    >
                      {item.active && <span className="nav-lantern" aria-hidden="true" />}
                      <span className="relative">{item.text}</span>
                    </ProtoLink>
                  ) : (
                    <span className="font-wenkai text-2xl tracking-[0.24em] text-foreground/40">{item.text}</span>
                  )}
                  {item.children.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
                      {item.children.map((c) => (
                        <li key={c.href}>
                          <ProtoLink
                            href={c.href}
                            external={c.external}
                            onClick={close}
                            aria-current={c.active ? 'page' : undefined}
                            className={cn('relative font-wenkai text-[15px] tracking-[0.12em]', focusRing, c.active ? 'text-foreground' : 'text-foreground/50')}
                          >
                            {c.text}
                            {c.active && <span aria-hidden="true" className="absolute -bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-(--lamp)" />}
                          </ProtoLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
