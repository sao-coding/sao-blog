// 階段 9 原型的共用小件
import type React from 'react'
import { Link } from '@tanstack/react-router'
import { getLocale } from '#/paraglide/runtime'
import { cn } from '@/lib/utils'
import { getSolarTerm } from '@/lib/season'
import { inkDryness } from '@/lib/season-spec'
import { setNavProto, useNavProto, type NavProto } from './nav-model'

/** 鍵盤焦點：一圈淡朱髮絲線，不靠底色 */
export const focusRing =
  'outline-none rounded-[2px] focus-visible:ring-1 focus-visible:ring-ink/70 focus-visible:ring-offset-4 focus-visible:ring-offset-background'

/** 站內走 Link、外部與 /rss.xml 走 <a> */
export function ProtoLink({
  href,
  external,
  ...props
}: Omit<React.ComponentProps<'a'>, 'href'> & { href: string; external?: boolean }) {
  return external || /^https?:\/\//.test(href) ? (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props} />
  ) : (
    <Link to={href} {...props} />
  )
}

/** 選單鈕：兩筆長短不一的墨線（不用三條槓） */
export function MenuGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeLinecap="round" className={cn('size-5', className)} aria-hidden="true">
      <path d="M3 7.5 Q 10 6.2 17.5 7.6" strokeWidth="1.6" />
      <path d="M3 12.6 Q 8.5 11.6 13.5 12.5" strokeWidth="1.3" />
    </svg>
  )
}

/** 一筆有起收的橫線（捲動後 header 的下緣） */
export function BrushRule({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1000 6" preserveAspectRatio="none" className={cn('h-1.5 w-full', className)} aria-hidden="true">
      <path d="M0 3.4 C 120 2.2, 300 2.6, 520 3 S 880 3.6, 1000 2.8 L 1000 3.4 C 860 4.6, 600 4.2, 420 4 S 90 4.4, 0 3.4 Z" fill="currentColor" />
    </svg>
  )
}

/** 寫成節氣的日期（「霜降」），這個節氣寫的回傳 wet */
export function termOf(iso: string) {
  const dryness = inkDryness(iso)
  return { term: getSolarTerm(new Date(iso)).term, dryness, wet: dryness === 'wet' }
}

const TEXT = {
  search: { 'zh-Hant': '尋', en: 'Search', ja: '検索' },
  using: { 'zh-Hant': '在用', en: 'In', ja: '使用中' },
  listening: { 'zh-Hant': '在聽', en: 'Listening', ja: '再生中' },
  away: { 'zh-Hant': '燈熄了', en: 'Away', ja: '留守' },
  lampOn: { 'zh-Hant': '站主在線', en: 'Online', ja: 'オンライン' },
  lampOff: { 'zh-Hant': '站主不在', en: 'Away', ja: '留守' },
} as const

/** 原型先寫死的文案，定案後進 messages/*.json */
export function protoText(key: keyof typeof TEXT) {
  const locale = getLocale() as 'zh-Hant' | 'en' | 'ja'
  return TEXT[key][locale] ?? TEXT[key]['zh-Hant']
}

/** 開發時才出現的切換器：左下角，切換現行／新 */
export function ProtoSwitch() {
  const current = useNavProto()
  const options: { v: NavProto; label: string }[] = [
    { v: 'current', label: '現行' },
    { v: 'new', label: '墨帶＋燈' },
  ]
  return (
    <div
      role="radiogroup"
      aria-label="導覽原型"
      className="fixed bottom-3 left-3 z-[70] flex gap-1 rounded-[3px] border border-rule bg-background px-1.5 py-1 font-wenkai text-xs"
    >
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={current === o.v}
          onClick={() => setNavProto(o.v)}
          className={cn('px-2 py-1 tracking-wider', focusRing, current === o.v ? 'text-ink' : 'text-foreground/55 hover:text-foreground')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
