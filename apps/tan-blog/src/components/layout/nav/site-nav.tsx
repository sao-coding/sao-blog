// 墨點導覽（階段 13，2026-10-29）
// 平時：左上站名，右上一點墨，畫面其他地方乾乾淨淨。
// 點那一點：墨落進水裡化開（用開場同一支 lib/ink-fluid.ts）——幾滴沿著選單往下落，化成一池紙色、邊緣帶墨流的紋；
// 選單的字從這池墨裡一項一項收乾浮出來，游標滑過會攪動墨流。
// 收起：字先散，墨被水沖淡，回到那一點。不支援 WebGL2 或減少動態效果時，選單直接淡入在一片紙上。
import { useEffect, useRef, useState } from 'react'
import { useLocation } from '@tanstack/react-router'
import { AnimatePresence, motion, useReducedMotion, type TargetAndTransition } from 'motion/react'
import { m } from '#/paraglide/messages'
import { cn } from '@/lib/utils'
import { siteName } from '@/lib/seo'
import { DURATION, EASE } from '@/lib/motion'
import { createInkFluid, type InkFluid } from '@/lib/ink-fluid'
import { cssRgb, inkTheme } from '@/lib/ink-intro'
import { useIsMobile } from '@/hooks/use-mobile'
import { useScrollStore } from '@/store/scroll-store'
import { useSearchStore } from '@/store/search-store'
import { openLoginDialog } from '@/store/login-dialog-store'
import { authClient } from '@/lib/auth-client'
import { LoginDialog } from '@/components/login-dialog'
import UserButton from './user-button'
import { SearchCommand } from './search-command'
import { NavLink, focusRing } from './nav-parts'
import { usePlaces, type Place } from './place-model'

type State = 'idle' | 'open' | 'closing'

const sec = (ms: number) => ms / 1000
/** 墨落下、化開之後，第一個字什麼時候浮出來 */
const FIRST_ITEM_MS = 380
/** 每一項之間 */
const ITEM_GAP_MS = 55
/** 沒有墨暈時（減少動態效果、沒有 WebGL2）收起要等多久 */
const PLAIN_CLOSE_MS = 220
/** 墨沿著選單往下落：離那一點的位移（px）、大小、延遲（ms）。最後一滴落在搜尋那一行附近 */
const DROPS: [dx: number, dy: number, size: number, delay: number][] = [
  [-10, 6, 6.5, 0],
  [-50, 90, 6, 110],
  [-60, 180, 6, 210],
  [-56, 270, 5.5, 300],
  [-44, 350, 5, 380],
  [-36, 432, 4.5, 450],
]

/** 推水的力道：比開場輕，墨紋少一點，像一池慢慢化開的墨，字壓在上面才讀得清楚 */
const DROP_FORCE = 0.5

/** 導覽的墨：池子是紙色，邊緣晝夜都用淡墨（前景混一半紙色），不混節氣色 */
function navInk() {
  const t = inkTheme()
  const fg = cssRgb('var(--foreground)')
  return { ...t, edge: fg.map((c, i) => c * 0.5 + t.base[i] * 0.5) as typeof t.edge, edgeK: 0.65, edgeMax: 0.36, accentMix: 0 }
}

export default function SiteNav() {
  const pathname = useLocation({ select: (l) => l.pathname })
  const places = usePlaces()
  const [state, setState] = useState<State>('idle')
  const scrolled = useScrollStore((s) => s.scrollTop > 40)
  const away = useScrollStore((s) => s.scrollTop > 240 && s.direction === 'down')

  const dotRef = useRef<HTMLButtonElement>(null)
  const inkRef = useRef<HTMLDivElement>(null)
  const fluid = useRef<InkFluid | null>(null)
  const timers = useRef<number[]>([])
  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms))
  // dispose 會讓 WebGL context 失效，同一張畫布不能再用：每次打開都換一張新的
  const dropInk = () => {
    fluid.current?.dispose()
    fluid.current = null
    inkRef.current?.replaceChildren()
  }

  const open = () => {
    clearTimers()
    dropInk()
    setState('open')
    const host = inkRef.current
    const dot = dotRef.current?.getBoundingClientRect()
    if (!host || !dot || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const canvas = document.createElement('canvas')
    canvas.className = 'block h-full w-full'
    host.append(canvas)
    const f = createInkFluid(canvas)
    if (!f) return dropInk()
    fluid.current = f
    f.pool(navInk())
    const x = dot.left + dot.width / 2
    const y = dot.top + dot.height / 2
    for (const [dx, dy, size, delay] of DROPS) later(() => f.drop(x + dx, y + dy, size, DROP_FORCE), delay)
  }
  // 第二欄：沿著它由上往下再落三滴，墨池往左長出一塊
  const unfold = (r: DOMRect) => {
    const f = fluid.current
    if (!f) return
    const x = r.left + r.width * 0.55
    for (const [k, size, delay] of [[0.12, 5, 0], [0.5, 4.8, 90], [0.88, 4.4, 180]] as const)
      later(() => f.drop(x, r.top + r.height * k, size, DROP_FORCE), delay)
  }
  const close = () => {
    clearTimers()
    setState((s) => (s === 'open' ? 'closing' : s))
    const f = fluid.current
    if (!f) {
      later(() => setState('idle'), PLAIN_CLOSE_MS)
      return
    }
    // 字先散，再讓水把墨沖掉
    later(() => {
      void f.reveal().then(() => {
        if (fluid.current !== f) return f.dispose()
        dropInk()
        setState((s) => (s === 'closing' ? 'idle' : s))
      })
    }, 120)
  }
  useEffect(() => () => {
    clearTimers()
    dropInk()
  }, [])
  useEffect(() => close(), [pathname])

  const isOpen = state === 'open'
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    // 游標滑過攪動墨流
    const onMove = (e: PointerEvent) => e.pointerType === 'mouse' && fluid.current?.stir(e.clientX, e.clientY, e.movementX, e.movementY)
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointermove', onMove)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointermove', onMove)
    }
  }, [isOpen])

  const here = places.find((p) => p.active)
  const engaged = state !== 'idle'
  const plain = engaged && !fluid.current
  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-[translate,background-color] duration-300 [view-transition-name:site-header]',
          scrolled && !engaged && 'bg-background',
          away && !engaged && '-translate-y-full'
        )}
      >
        <div className="relative mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between px-5 md:px-8">
          <NavLink href="/" className={cn('font-display text-[19px] tracking-[0.14em] text-ink-1 [:lang(en)_&]:tracking-[0.03em]', focusRing)}>
            {siteName()}
          </NavLink>
          <div className="flex items-center gap-2">
          {/* 所在的區名寫在墨點旁邊，當這一頁的標題（各區首頁不再另寫大標題，見 components/layout/list-parts.tsx）；打開選單時讓給選單 */}
          {here && here.key !== 'home' && (
            <NavLink
              href={here.href}
              className={cn(
                'font-display text-[17px] tracking-[0.12em] text-ink-2 transition-[color,opacity] duration-300 hover:text-zhu [:lang(en)_&]:tracking-[0.02em]',
                focusRing,
                engaged && 'pointer-events-none opacity-0',
              )}
            >
              {here.text}
            </NavLink>
          )}
          <button
            ref={dotRef}
            type="button"
            aria-expanded={isOpen}
            aria-controls="ink-nav-menu"
            aria-label={isOpen ? m.mobile_menu_close() : m.mobile_menu_open()}
            onClick={isOpen ? close : open}
            className={cn('group -mr-3 flex size-11 items-center justify-center', focusRing)}
          >
            <InkDot state={state} />
          </button>
          </div>
          <Menu open={isOpen} places={places} onPick={close} onUnfold={unfold} />
        </div>
        <span aria-hidden="true" className={cn('absolute inset-x-0 bottom-0 h-px bg-ink-5 transition-opacity duration-300', scrolled && !engaged ? 'opacity-100' : 'opacity-0')} />
      </header>

      {/* 墨暈的畫布在 header 底下、內文上面；點畫布以外（墨池外）也收起 */}
      {/* 換頁時自成一層（nav-ink），不跟著舊頁一起暈掉，收起的墨照常播完（styles.css「墨洇」） */}
      <div ref={inkRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-40 [view-transition-name:nav-ink] empty:hidden" />
      {engaged && (
        <div
          aria-hidden="true"
          onClick={close}
          className={cn(
            // 在墨的畫布（z-40）底下，畫布不吃點擊，點墨池外就點到這裡
            'fixed inset-0 z-[39] transition-opacity duration-300',
            // 沒有墨暈時，用一片紙蓋住內文；手機上墨池蓋不滿，後面的內文也退成淡淡的
            plain ? 'bg-background/90' : 'max-md:bg-background/70',
            isOpen ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}
      {/* 搜尋對話框與 ⌘K、登入對話框還是用原本的元件 */}
      <span className="hidden">
        <SearchCommand />
      </span>
      <LoginDialog />
    </>
  )
}

/**
 * 那一點墨（動畫在 styles.css「墨點」一節）：
 * 墨芯——邊緣不齊、帶一點濕亮；洇痕——一圈淡墨滲進紙裡，平時慢慢一呼一吸；旁邊兩三點濺出去的細墨。
 * 滑過時墨芯鼓起，像要滴下去；點下去墨芯落進水裡，原地留一圈漣漪，那圈漣漪就是收起的按鈕。
 */
function InkDot({ state }: { state: State }) {
  return (
    // 晝是墨；夜裡淺色的墨點看起來像月亮，改用燈下的朱
    <svg aria-hidden="true" viewBox="0 0 32 32" className="ink-dot size-10 overflow-visible text-ink-1 dark:text-zhu" data-state={state}>
      <defs>
        <filter id="ink-dot-bleed" x="-50%" y="-50%" width="200%" height="200%">
          <feTurbulence type="fractalNoise" baseFrequency="0.32" numOctaves="2" seed="3" />
          <feDisplacementMap in="SourceGraphic" scale="4.5" />
          <feGaussianBlur stdDeviation="0.7" />
        </filter>
        <filter id="ink-dot-edge" x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="11" />
          <feDisplacementMap in="SourceGraphic" scale="0.8" />
        </filter>
      </defs>
      {/* 洇痕：外圈很淡、內圈稍濃，都被紙纖維打散 */}
      <g className="ink-dot-halo" filter="url(#ink-dot-bleed)">
        <g className="ink-dot-soak">
          <circle cx="16" cy="16.4" r="9.5" fill="currentColor" fillOpacity="0.18" />
          <circle cx="15.8" cy="16.2" r="6.5" fill="currentColor" fillOpacity="0.38" />
        </g>
      </g>
      {/* 濺出去的細墨 */}
      <g className="ink-dot-specks" fill="currentColor">
        <circle cx="24.6" cy="9.4" r="0.85" fillOpacity="0.8" />
        <circle cx="26.4" cy="12" r="0.5" fillOpacity="0.65" />
        <circle cx="7.6" cy="23.2" r="0.6" fillOpacity="0.55" />
      </g>
      {/* 平時每隔幾秒接連泛出兩圈朱色漣漪：提示這裡可以點 */}
      <g fill="none" stroke="var(--zhu)" strokeWidth="1.6" filter="url(#ink-dot-edge)">
        <circle className="ink-dot-pulse" cx="16" cy="16" r="6.5" />
        <circle className="ink-dot-pulse ink-dot-pulse-2" cx="16" cy="16" r="6.5" />
      </g>
      {/* 墨芯：不是正圓，右下比較飽（墨往下墜） */}
      {/* 大小寫在裡面那層：外層的 transform 留給 CSS 的滑過、下墜 */}
      <g className="ink-dot-core">
      <g transform="translate(16 16) scale(0.9) translate(-16 -16)">
        <path
          filter="url(#ink-dot-edge)"
          fill="currentColor"
          d="M15.9 11.3c2.7-.2 4.9 1.8 4.9 4.6.1 2.9-2.1 5-4.9 5-2.7.1-4.8-1.9-4.7-4.7 0-2.6 2.1-4.7 4.7-4.9z"
        />
        {/* 濕亮：墨還沒乾 */}
        <ellipse className="ink-dot-sheen" cx="14.4" cy="13.9" rx="1.15" ry="0.75" transform="rotate(-30 14.4 13.9)" fill="var(--background)" fillOpacity="0.38" />
      </g>
      </g>
      {/* 落下之後的漣漪：打開時才出現，也是收起的按鈕；邊緣跟墨芯一樣微微不齊，像手畫的一圈 */}
      <circle className="ink-dot-ripple" cx="16" cy="16" r="7" fill="none" stroke="currentColor" strokeWidth="0.55" filter="url(#ink-dot-edge)" />
    </svg>
  )
}

/** 字從墨裡收乾浮出來：由上往下一項一項，模糊 → 清楚 */
/** quick：第二欄換一區時不用再等墨落下，馬上一項一項出來 */
function rise(i: number, reduce: boolean | null, quick = false) {
  const hidden: TargetAndTransition = { opacity: 0, filter: reduce ? 'none' : 'blur(6px)', y: reduce ? 0 : -5 }
  return {
    initial: hidden,
    animate: {
      opacity: 1,
      filter: reduce ? 'none' : 'blur(0px)',
      y: 0,
      transition: { duration: sec(reduce ? 200 : DURATION.in + 100), ease: EASE.out, delay: sec(reduce ? 0 : (quick ? 120 : FIRST_ITEM_MS) + i * ITEM_GAP_MS) },
    } as TargetAndTransition,
    exit: {
      ...hidden,
      filter: reduce ? 'none' : 'blur(5px)',
      y: 0,
      transition: { duration: sec(reduce ? 150 : DURATION.out), ease: 'easeIn' },
    } as TargetAndTransition,
  }
}

const sectionText = (active: boolean) =>
  cn(
    'block py-[0.4rem] font-display text-[17px] tracking-[0.3em] whitespace-nowrap transition-colors duration-200 [:lang(en)_&]:tracking-[0.04em]',
    active ? 'text-zhu' : 'text-ink-1 hover:text-zhu',
    focusRing
  )

/**
 * 選單：第一欄只有各區。有子項目的那一區（文章、日記、友鏈）——
 * 桌機：滑過或用鍵盤移到它，左邊再落一滴墨，化開成第二欄；打開時先展開所在那一區。點區名直接過去。
 * 手機：點區名，第二欄取代第一欄，最上面一行「‹ 文章」回去。
 */
function Menu({ open, places, onPick, onUnfold }: { open: boolean; places: Place[]; onPick: () => void; onUnfold: (r: DOMRect) => void }) {
  const reduce = useReducedMotion()
  const isMobile = useIsMobile()
  const current = places.find((p) => p.active)
  const [shelf, setShelf] = useState<string | null>(null)
  const [shelfTop, setShelfTop] = useState(0)
  const dropped = useRef(new Set<string>())
  const shelfRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    dropped.current.clear()
    const start = !isMobile && current && current.children.length > 0 ? current.key : null
    setShelf(start)
    setShelfTop(0)
    if (!start) return
    // 等第一欄排好，第二欄對齊所在那一區
    const id = requestAnimationFrame(() => {
      const li = document.querySelector<HTMLElement>(`#ink-nav-menu [data-place="${start}"]`)
      if (li) setShelfTop(li.offsetTop)
    })
    return () => cancelAnimationFrame(id)
  }, [open, isMobile])

  // 第二欄出來時，在它那裡再落一滴墨（每一區只落一次）
  useEffect(() => {
    if (!open || isMobile || !shelf || dropped.current.has(shelf)) return
    // 等第二欄對齊好才落墨；位置還在變時（shelfTop 更新）這次取消、下次再落
    const id = window.setTimeout(() => {
      dropped.current.add(shelf)
      const r = shelfRef.current?.getBoundingClientRect()
      if (r) onUnfold(r)
    }, 30)
    return () => window.clearTimeout(id)
  }, [open, isMobile, shelf, shelfTop])

  const focusSection = (p: Place, li: HTMLElement) => {
    if (isMobile) return
    if (p.children.length === 0) return setShelf(null)
    setShelf(p.key)
    // 第二欄的第一行對齊滑過的那一區（第一行「全部」與區名同高）
    setShelfTop(li.offsetTop)
  }
  const shelfPlace = places.find((p) => p.key === shelf)

  const sections = (
    <ul className="flex flex-col items-end text-right">
      {places.map((p, i) => (
        <motion.li key={p.key} data-place={p.key} {...rise(i, reduce)} onPointerEnter={(e) => focusSection(p, e.currentTarget)} onFocus={(e) => focusSection(p, e.currentTarget)}>
          {isMobile && p.children.length > 0 ? (
            <button type="button" onClick={() => setShelf(p.key)} className={cn(sectionText(p.active), 'flex items-baseline gap-2')}>
              {p.text}
              <span aria-hidden="true" className="text-[13px] tracking-normal text-ink-3">›</span>
            </button>
          ) : (
            <NavLink href={p.href} onClick={onPick} aria-current={p.active ? 'page' : undefined} className={sectionText(p.active)}>
              {p.text}
            </NavLink>
          )}
        </motion.li>
      ))}
      <motion.li {...rise(places.length + 1, reduce)} className="mt-3 flex gap-5 text-[13px]">
        <SearchEntry onBefore={onPick} />
        <ReaderEntry onBefore={onPick} />
      </motion.li>
    </ul>
  )

  return (
    <AnimatePresence>
      {open && (
        <motion.nav
          key="menu"
          id="ink-nav-menu"
          aria-label={m.mobile_menu_title()}
          className="absolute top-[3.6rem] right-5 flex items-start gap-12 md:right-8"
          exit={{ opacity: 1, transition: { duration: sec(DURATION.out) } }}
        >
          {/* 桌機的第二欄在左邊；手機的第二欄取代第一欄 */}
          <AnimatePresence mode="wait" initial={false}>
            {shelfPlace && (
              <motion.div
                key={shelfPlace.key}
                ref={shelfRef}
                style={{ marginTop: isMobile ? 0 : shelfTop }}
                exit={{ opacity: 0, transition: { duration: sec(DURATION.out) * 0.7 } }}
              >
                {isMobile && (
                  <motion.button
                    type="button"
                    {...rise(0, reduce)}
                    onClick={() => setShelf(null)}
                    className={cn('mb-1 ml-auto flex items-baseline gap-2', sectionText(shelfPlace.active))}
                  >
                    <span aria-hidden="true" className="text-[13px] tracking-normal text-ink-3">‹</span>
                    {shelfPlace.text}
                  </motion.button>
                )}
                <Shelf place={shelfPlace} onPick={onPick} reduce={reduce} first={isMobile ? 1 : 0} />
              </motion.div>
            )}
          </AnimatePresence>
          {!(isMobile && shelfPlace) && sections}
        </motion.nav>
      )}
    </AnimatePresence>
  )
}

/** 第二欄：子項目，最後一行是「其他 N 類 →」「全部專欄 →」 */
function Shelf({ place, onPick, reduce, first }: { place: Place; onPick: () => void; reduce: boolean | null; first: number }) {
  return (
    <ul className="flex flex-col items-end text-right">
      {place.children.map((c, i) => (
        <motion.li key={c.href + c.text} {...rise(first + i, reduce, true)}>
          <NavLink
            href={c.href}
            onClick={onPick}
            aria-current={c.active ? 'page' : undefined}
            className={cn(
              'block py-[0.45rem] text-[14.5px] tracking-[0.16em] whitespace-nowrap transition-colors duration-200 [:lang(en)_&]:tracking-[0.02em]',
              c.more ? 'mt-1 text-[13px] text-ink-3 hover:text-ink-1' : c.active ? 'text-zhu' : 'text-ink-2 hover:text-ink-1',
              focusRing
            )}
          >
            {c.count !== undefined && <span className="mr-2 font-mono text-[10.5px] tracking-normal text-ink-3 tabular-nums">{c.count}</span>}
            {c.text}
            {c.more && <span aria-hidden="true"> →</span>}
          </NavLink>
        </motion.li>
      ))}
    </ul>
  )
}

// ─── 搜尋、讀者 ─────────────────────────────────────────

const toolText = cn('tracking-[0.16em] text-ink-3 transition-colors hover:text-ink-1 [:lang(en)_&]:tracking-normal', focusRing)

function SearchEntry({ onBefore }: { onBefore?: () => void }) {
  const setOpen = useSearchStore((s) => s.setOpen)
  return (
    <button
      type="button"
      onClick={() => {
        onBefore?.()
        setOpen(true)
      }}
      className={toolText}
    >
      {m.search_open()}
    </button>
  )
}

function ReaderEntry({ onBefore }: { onBefore?: () => void }) {
  const { data: session } = authClient.useSession()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (mounted && session?.user) return <UserButton />
  return (
    <button
      type="button"
      onClick={() => {
        onBefore?.()
        openLoginDialog()
      }}
      className={toolText}
    >
      {m.reader_login()}
    </button>
  )
}
