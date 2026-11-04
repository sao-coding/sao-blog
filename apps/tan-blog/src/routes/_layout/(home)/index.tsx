import { useRef, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { orpc } from '@/lib/orpc'
import { HOME_TITLE, pageHead, websiteJsonLd } from '@/lib/seo'
import { currentContentLocale } from '@/lib/content-locale'
import { daysUntil, KO_NAMES, KO_ORDER, termAt } from '@/lib/saijiki'
import { useHomeView } from '@/lib/home-mode'
import { useTheme } from '@/components/theme-provider'
import { cn } from '@/lib/utils'
import { authClient } from '@/lib/auth-client'
import { m } from '@/paraglide/messages'
import { WaterReflection, WaterSurface } from './-components/water-surface'
import { BrushSurface } from './-components/brush-surface'
import { PIGMENT_VAR, PIGMENTS, setPigment, setTool, usePigment, useTool, type Pigment } from './-components/brush-pigment'
import { IconEraser } from '@tabler/icons-react'
import { ToriiLayer } from './-components/torii-layer'
import { SOCIAL_LINKS } from '@/config/social'
import { LetterSignature } from '@/components/letter-paper'
import { HomeLetter } from './-components/home-letter'
import { Enso } from './-components/enso'

export const Route = createFileRoute('/_layout/(home)/')({
  loader: async ({ context }) => {
    const res = await context.queryClient.ensureQueryData(
      orpc.home.getHome.queryOptions({ input: { locale: currentContentLocale() } })
    )
    return res
  },
  head: () => ({
    ...pageHead({ title: HOME_TITLE, path: '/' }),
    scripts: [websiteJsonLd()],
  }),
  headers: () => ({
    'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=600',
  }),
  component: HomePage,
})

// 首頁（DESIGN.md 第 5 節，階段 14）：首屏不高（約七成畫面），左邊是名字、兩行標語、社群連結；社群連結那一行的底就是水線，
// 右邊一座水墨鳥居站在水線上（開場退掉後一筆一筆畫出來）。下面是一封信與円相。
// 水面模式：水線以下是水，鳥居與社群連結倒映在水裡，點水滴墨；筆跡模式：同一張紙，游標就是筆；素面：只有字，沒有鳥居。
// 用哪一種見 lib/home-mode.ts。版面由 <html data-home-view> 決定（<head> 裡就標好），不會先出現水面的版面再變過去。
function HomePage() {
  const { data } = Route.useLoaderData()
  const view = useHomeView()
  const { theme } = useTheme()
  const [live, setLive] = useState(false)
  const [painted, setPainted] = useState(false)
  const [inkOut, setInkOut] = useState(false)
  // 登入的人寫的才會送出去、留在紙上（DESIGN.md 第 5 節）
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const signedIn = !!session?.user
  const shoreRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  // live 只會在瀏覽器裡變 true，這裡讀 matchMedia 不會跟伺服器的 HTML 對不上
  const touch = live && matchMedia('(pointer: coarse)').matches

  const now = new Date()
  const term = termAt(now)
  // 円相的墨：文章、日記、想法都算；文章、日記另外落一個「、」
  const ensoEntries = [...data.timeline.items, ...(data.thoughtDates ?? []).map((createdAt, i) => ({ id: `thought-${i}`, createdAt }))]
  const hint =
    view === 'water'
      ? touch ? m.home_water_hint_touch() : m.home_water_hint()
      : view === 'brush'
        ? inkOut ? m.home_brush_ink_out() : touch ? m.home_brush_hint_touch() : m.home_brush_hint()
        : ''

  return (
    <div className={cn('relative', view === 'brush' && 'touch-pan-y')}>
      <section
        className={cn(
          'relative -mt-[4.5rem] h-[clamp(32rem,72svh,44rem)]',
          '[html[data-home-view=plain]_&]:h-auto'
        )}
      >
        {/* 換晝夜時整片重建：墨、水紋、倒影的顏色在建立時讀 token */}
        {view !== 'plain' && <ToriiLayer key={`torii-${theme}`} shore={shoreRef} onPainted={() => setPainted(true)} />}
        {view === 'water' && <WaterSurface key={`water-${theme}`} onLive={setLive} shore={shoreRef} reflect={painted} />}
        {view === 'brush' && <WaterReflection key={`refl-${theme}`} shore={shoreRef} reflect={painted} />}

        {/* 水線以上：名字、標語、社群連結（最後一行貼著水線） */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[58%] [html[data-home-view=plain]_&]:static [html[data-home-view=plain]_&]:h-auto [html[data-home-view=plain]_&]:pt-36">
          <div className="mx-auto flex h-full w-full max-w-7xl flex-col justify-end px-5 md:px-8">
            <div ref={textRef} className="w-fit">
              <h1 lang="zh-Hant" className="font-display text-4xl tracking-[0.12em] text-ink-1 md:text-5xl">
                {m.home_hero_name()}
              </h1>
              <div data-enter className="mt-4 font-display text-base leading-relaxed text-ink-2 md:text-lg">
                <p>{m.home_hero_line1()}</p>
                <p>{m.home_hero_line2()}</p>
              </div>
              <div
                data-enter
                ref={shoreRef}
                className="pointer-events-auto mt-6 flex flex-wrap items-end gap-x-4 gap-y-2 text-ink-2"
              >
                {SOCIAL_LINKS.map((s) => (
                  <a
                    key={s.name}
                    href={s.href}
                    {...(s.href.startsWith('/') ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
                    aria-label={s.name}
                    title={s.name}
                    className="block transition-colors duration-200 outline-none hover:text-zhu focus-visible:text-zhu"
                  >
                    <s.icon aria-hidden="true" className="block size-[22px]" stroke={1.5} />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 水面的最下面：節氣與候、提示 */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 [html[data-home-view=plain]_&]:static">
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-end justify-between gap-x-6 gap-y-2 px-5 pt-10 pb-6 md:px-8">
            {/* 節氣、候名三語都用漢字；周圍的說明照語系翻譯 */}
            <p data-enter className="flex flex-col gap-1">
              <span lang="zh-Hant" className="font-display text-[15px] tracking-[0.24em] text-ink-2">
                <span className="text-zhu">{term.name}</span>
                <span className="text-ink-3">・{KO_ORDER[term.ko]}</span>
                <span className="ml-3">{KO_NAMES[term.index][term.ko]}</span>
              </span>
              <span className="text-[13px] text-ink-3">
                {m.home_until_next({ next: term.next.name, days: daysUntil(term.next.start, now) })}
              </span>
            </p>
            <div
              className={cn(
                'flex items-center gap-4 transition-opacity duration-700',
                hint && live && (view !== 'brush' || painted) ? 'opacity-100' : 'opacity-0'
              )}
            >
              <p aria-hidden="true" className="text-[12px] tracking-[0.06em] text-ink-3">
                {hint || ' '}
                {/* 沒登入：寫的只在自己畫面上；說一聲登入後會留下來 */}
                {view === 'brush' && !sessionPending && !signedIn && <span className="block">{m.home_brush_keep()}</span>}
              </p>
              {view === 'brush' && <PigmentPicker eraser={signedIn} />}
            </div>
          </div>
        </div>
      </section>

      {/* 首屏以下：左邊一封信、右邊円相（DESIGN.md 第 5 節） */}
      <section className="mx-auto w-full max-w-7xl px-5 pt-16 md:px-8 md:pt-24">
        <div className="grid items-center gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:gap-20">
          <div>
            <HomeLetter works={data.timeline.items} thought={data.musings[0]} comment={data.letters[0]} term={term} now={now} />
            <LetterSignature date={now} className="mt-12 lg:mr-[8%]" />
          </div>
          <Enso entries={ensoEntries} now={now} />
        </div>
        <nav
          data-enter
          className="mt-14 flex w-fit gap-8 border-t border-ink-5 pt-4 text-[15px] text-ink-2 [&>a]:outline-none [&>a]:transition-colors [&>a]:duration-200 [&>a:hover]:text-zhu [&>a:focus-visible]:text-zhu"
        >
          <Link to="/posts">{m.home_all_posts()}</Link>
          <Link to="/thinking">{m.home_letter_thoughts()}</Link>
        </nav>
      </section>
      {/* 筆跡：整個首頁都是紙（畫布蓋在上面、不吃滑鼠，事件從這一層收） */}
      {view === 'brush' && (
        <BrushSurface
          key={`brush-${theme}`}
          onLive={setLive}
          shore={shoreRef}
          demo={painted}
          signedIn={signedIn}
          onInkOut={() => setInkOut(true)}
        />
      )}
    </div>
  )
}

/** 筆的顏料：一排小色點，選中的那一個外面一圈細線（筆跡模式才有）。登入的人最後多一個橡皮擦 */
function PigmentPicker({ eraser }: { eraser: boolean }) {
  const pigment = usePigment()
  const tool = useTool()
  return (
    <div role="radiogroup" aria-label={m.home_brush_pigment()} className="pointer-events-auto flex items-center">
      {PIGMENTS.map((p) => (
        <button
          key={p}
          type="button"
          role="radio"
          aria-checked={tool === 'brush' && pigment === p}
          aria-label={PIGMENT_NAMES[p]()}
          title={PIGMENT_NAMES[p]()}
          onClick={() => setPigment(p)}
          className="group grid size-6 place-items-center outline-none"
        >
          <span
            style={{ background: PIGMENT_VAR[p] }}
            className={cn(
              'block size-2.5 rounded-full outline-offset-[3px] transition-[outline-color] duration-200',
              tool === 'brush' && pigment === p
                ? 'outline outline-1 outline-ink-3'
                : 'outline outline-1 outline-transparent group-hover:outline-ink-4 group-focus-visible:outline-zhu'
            )}
          />
        </button>
      ))}
      {eraser && (
        <button
          type="button"
          role="radio"
          aria-checked={tool === 'eraser'}
          aria-label={m.home_brush_eraser()}
          title={m.home_brush_eraser()}
          onClick={() => setTool('eraser')}
          className={cn(
            'ml-1 grid size-6 place-items-center outline-none transition-colors duration-200 focus-visible:text-zhu',
            tool === 'eraser' ? 'text-ink-1' : 'text-ink-3 hover:text-ink-2'
          )}
        >
          <IconEraser aria-hidden="true" className="size-[15px]" stroke={1.5} />
        </button>
      )}
    </div>
  )
}

const PIGMENT_NAMES: Record<Pigment, () => string> = {
  mo: m.home_pigment_mo,
  zhemo: m.home_pigment_zhemo,
  zheshi: m.home_pigment_zheshi,
  tenghuang: m.home_pigment_tenghuang,
  zhilu: m.home_pigment_zhilu,
  shilu: m.home_pigment_shilu,
  huaqing: m.home_pigment_huaqing,
  zhu: m.home_pigment_zhu,
}
