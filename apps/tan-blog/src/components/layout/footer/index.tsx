// 站尾（階段 13，2026-10-29）：上緣是收尾一筆（捲到頁底才寫出來）；左邊一行落款——干支年、節氣・第幾候、候名、站名（跟文末的干支落款同一套字），
// 右邊三組開關，都寫成字，選中的那一個下面一筆細朱：首頁的樣子（筆跡｜水面｜素面）、晝｜夜、語言。
// 節氣與干支三語都用漢字。季節預覽拿掉了：節氣照真實日期走。
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { m } from '#/paraglide/messages'
import { getLocale, locales, setLocale } from '#/paraglide/runtime'
import { cn } from '@/lib/utils'
import { siteName } from '@/lib/seo'
import { siteTime } from '@/lib/site-time'
import { KO_NAMES, KO_ORDER, termAt } from '@/lib/saijiki'
import { ganzhiYear } from '@/lib/ganzhi'
import { setHomeMode, useHomeMode } from '@/lib/home-mode'
import { useTheme } from '@/components/theme-provider'
import { focusRing } from '../nav/nav-parts'

/** 語言用自己的文字寫，不翻譯 */
const LOCALE_NAMES: Record<(typeof locales)[number], string> = { 'zh-Hant': '中文', en: 'English', ja: '日本語' }

const Footer = () => {
  const now = new Date()
  const term = termAt(now)
  const homeMode = useHomeMode()
  const { theme, setTheme } = useTheme()
  // 主題在 <head> 就套用了，伺服器不知道；等 hydration 後才標出選中的那一個
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const locale = getLocale()

  return (
    <footer className="relative mt-32 w-full">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <FinalStroke />
      </div>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 pt-7 pb-10 md:flex-row md:items-baseline md:justify-between md:px-8">
        <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          {/* 落款寫到候：干支年、節氣・第幾候、候名（每五天左右換一次） */}
          <span lang="zh-Hant" className="font-display text-[15px] tracking-[0.24em] text-ink-2">
            {ganzhiYear(now)}年<span className="ml-3 text-zhu">{term.name}</span>
            <span className="text-ink-3">・{KO_ORDER[term.ko]}</span>
            <span className="ml-3">{KO_NAMES[term.index][term.ko]}</span>
          </span>
          <span className="font-display text-[15px] tracking-[0.14em] text-ink-2 [:lang(en)_&]:tracking-[0.02em]">{siteName()}</span>
          <span className="text-[12px] text-ink-3 tabular-nums">© {siteTime(now).year()}</span>
        </p>

        <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3 text-[13.5px]">
          <Group label={m.home_mode_label()} title={m.footer_home_mode()}>
            <Pick on={mounted && homeMode === 'brush'} onClick={() => setHomeMode('brush')}>
              {m.home_mode_brush()}
            </Pick>
            <Pick on={mounted && homeMode === 'water'} onClick={() => setHomeMode('water')}>
              {m.home_mode_water()}
            </Pick>
            <Pick on={mounted && homeMode === 'plain'} onClick={() => setHomeMode('plain')}>
              {m.home_mode_plain()}
            </Pick>
          </Group>
          <Group label={m.theme_toggle()}>
            <Pick on={mounted && theme !== 'dark'} onClick={() => setTheme('light')}>
              {m.theme_day()}
            </Pick>
            <Pick on={mounted && theme === 'dark'} onClick={() => setTheme('dark')}>
              {m.theme_night()}
            </Pick>
          </Group>
          <Group label={m.footer_language_label()} bare>
            {locales.map((l) => (
              <Pick key={l} on={l === locale} lang={l} onClick={() => l !== locale && setLocale(l)}>
                {LOCALE_NAMES[l]}
              </Pick>
            ))}
          </Group>
        </div>
      </div>
    </footer>
  )
}

/**
 * 收尾一筆：footer 上緣的一筆乾筆墨，捲到頁底時從左往右寫出來。
 * 起筆藏鋒（圓、鈍、墨飽），中段漸細，收筆出鋒、墨將盡處透出紙的飛白。動畫在 styles.css「收尾一筆」。
 */
function FinalStroke() {
  const ref = useRef<SVGSVGElement>(null)
  const [written, setWritten] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        setWritten(true)
        io.disconnect()
      },
      { threshold: 0.6 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <svg ref={ref} aria-hidden="true" viewBox="0 0 1000 16" preserveAspectRatio="none" className="final-stroke block h-4 w-full text-ink-2" data-written={written}>
      <defs>
        {/* 筆毛的紋：橫向拉長的雜訊，讓邊緣毛、墨色不勻 */}
        <filter id="final-stroke-dry" x="-2%" y="-60%" width="104%" height="220%">
          <feTurbulence type="fractalNoise" baseFrequency="0.004 0.55" numOctaves="2" seed="5" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="5" />
        </filter>
        {/* 墨越寫越乾：後段漸透，最後幾道飛白 */}
        <linearGradient id="final-stroke-ink" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.85" />
          <stop offset="0.55" stopColor="currentColor" stopOpacity="0.6" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.15" />
        </linearGradient>
        <mask id="final-stroke-hair">
          <rect width="1000" height="16" fill="white" />
          <g stroke="black" strokeLinecap="round">
            <path d="M380 7.2 L700 7.6" strokeWidth="0.5" />
            <path d="M470 9.6 L998 9.2" strokeWidth="0.8" />
            <path d="M560 5.6 L1000 6.2" strokeWidth="0.7" />
            <path d="M650 8.3 L996 8.1" strokeWidth="0.6" />
            <path d="M760 10.6 L990 10.2" strokeWidth="0.9" />
          </g>
        </mask>
      </defs>
      <g filter="url(#final-stroke-dry)" mask="url(#final-stroke-hair)">
        <path
          fill="url(#final-stroke-ink)"
          d="M4 8 C 3 3.2, 12 1.6, 28 2.6 C 70 3.6, 120 4.8, 200 4.4 C 330 3.8, 450 5.6, 600 5.2 C 760 4.9, 900 6.3, 998 7.4 C 930 9.2, 820 9.6, 690 10.6 C 540 11.6, 420 11.2, 300 12.2 C 190 13.1, 90 13.6, 30 13.4 C 12 13.3, 5 11.6, 4 8 Z"
        />
      </g>
    </svg>
  )
}

/** 一組開關：前面一個淡淡的名字（有的話），選項之間用細的「｜」隔開 */
function Group({ label, title, bare, children }: { label: string; title?: string; bare?: boolean; children: ReactNode[] }) {
  return (
    <div role="group" aria-label={label} className="flex items-baseline gap-2.5">
      {title && <span className="text-ink-3">{title}</span>}
      {children.map((c, i) => (
        <span key={i} className="flex items-baseline gap-2.5">
          {i > 0 && !bare && <span aria-hidden="true" className="text-ink-4">｜</span>}
          {c}
        </span>
      ))}
    </div>
  )
}

function Pick({ on, lang, onClick, children }: { on: boolean; lang?: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      lang={lang}
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        'relative tracking-[0.12em] transition-colors duration-200 [:lang(en)_&]:tracking-[0.02em]',
        on ? 'text-ink-1' : 'text-ink-3 hover:text-ink-1',
        focusRing
      )}
    >
      {children}
      {on && <span aria-hidden="true" className="absolute inset-x-0 -bottom-1 h-px bg-zhu" />}
    </button>
  )
}

export default Footer
