// 首頁的円相（DESIGN.md 第 5 節，2026-11-03 站主選的）：一年寫成一個圓，是時光頁乾筆線（timeline/-components/brush-line.tsx）的另一種寫法。
// - 一圈從立春起算（干支也在立春換年），順時針，立春在左上。一個節氣一段：那個節氣寫得多（文章、日記、想法都算），那一段就飽、黑、粗；
//   沒寫就乾到只剩幾絲飛白。筆寫到今天就停，今天到明年立春還沒寫，就是円相的缺口。
// - 目前所在的那一段用朱。每篇文章、日記一個書法的「、」落在圓外，滑過或鍵盤移到時圓心換成那一篇。
// 形狀由年份與每一篇的 id 決定，SSR 與瀏覽器畫出來一樣。只用 --foreground 的墨與朱，晝夜跟著換。
import { useLayoutEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { springYear } from '@/lib/saijiki'
import { siteTime } from '@/lib/site-time'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import { BrushDot, hash, rng } from '../../timeline/-components/brush-line'
import { rich, token } from './rich'

const SIZE = 400
const C = SIZE / 2
const R = 146
const A0 = (-135 * Math.PI) / 180
const SEG = (Math.PI * 2) / 24
const BRISTLES = 13
const STEP = 2.5
// 整圈寫完的時間；寫到今天的那一段照比例
const DRAW = 2.4
const HOUR = 3_600_000

export interface EnsoEntry {
  id: string
  createdAt: string
  // 文章、日記有標題和連結，落一個「、」；想法只算進墨裡
  title?: string
  href?: string
}

const polar = (r: number, a: number) => [C + r * Math.cos(a), C + r * Math.sin(a)] as const
const pct = (v: number) => `${((v / SIZE) * 100).toFixed(3)}%`

export function Enso({ entries, now }: { entries: EnsoEntry[]; now: Date }) {
  const year = springYear(now)
  const begin = year[0].start
  // 以小時取整：伺服器與瀏覽器畫出來的筆畫座標才對得上（hydration）
  const t = Math.floor(now.getTime() / HOUR) * HOUR
  const termIndex = (ms: number) => year.findIndex((s) => ms >= s.start && ms < s.end)
  // 寫到哪裡（以段為單位，含今天在這個節氣走了幾成）
  const cur = Math.max(0, termIndex(t))
  const progress = cur + (t - year[cur].start) / (year[cur].end - year[cur].start)
  const at = (ms: number) => {
    const k = termIndex(ms)
    return k + (ms - year[k].start) / (year[k].end - year[k].start)
  }

  const inYear = entries.filter((e) => {
    const ms = new Date(e.createdAt).getTime()
    return ms >= begin && ms <= t
  })
  const counts = Array.from({ length: 24 }, () => 0)
  for (const e of inYear) counts[termIndex(new Date(e.createdAt).getTime())]++
  const written = inYear.filter((e) => e.href)

  const [focus, setFocus] = useState<EnsoEntry | null>(null)
  const box = useRef<HTMLDivElement>(null)

  // 捲到才寫出來：照順序寫到今天、每一點在筆經過時落下（styles.css「首頁的円相」）。只寫一次；減少動態效果直接是寫好的
  useLayoutEffect(() => {
    const el = box.current
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    el.dataset.enso = 'pending'
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        el.dataset.enso = 'written'
        io.disconnect()
      },
      { rootMargin: '0px 0px -20% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const segs = strokes(year[0].year, counts, cur, progress)
  const secPerSeg = DRAW / 24

  // 同一天前後的點往外疊一層，不擠在一起
  let last = -Infinity
  let ring = 0
  const dots = [...written]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((e) => {
      const p = at(new Date(e.createdAt).getTime())
      ring = p - last < 0.25 ? (ring + 1) % 3 : 0
      last = p
      const [x, y] = polar(R + 26 + ring * 10, A0 + p * SEG)
      return { e, p, x, y }
    })

  const quarters = [0, 6, 12, 18].map((k) => {
    const [x, y] = polar(R + 50, A0 + k * SEG)
    return { name: year[k].name, x, y }
  })

  return (
    <div ref={box} data-enter className="enso relative mx-auto aspect-square w-full max-w-[28rem]">
      <svg aria-hidden viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 size-full overflow-visible">
        {segs.map((s) => (
          <g
            key={s.now ? 'now' : 'ink'}
            className={s.now ? 'enso-now' : 'enso-ink'}
            style={{ '--enso-delay': `${(s.from * secPerSeg).toFixed(3)}s`, '--enso-dur': `${(s.span * secPerSeg).toFixed(3)}s` } as React.CSSProperties}
          >
            {s.paths.map((p, i) => (
              <path
                key={i}
                d={p.d}
                pathLength={1}
                fill="none"
                stroke="currentColor"
                strokeOpacity={+p.o.toFixed(2)}
                strokeWidth={+p.w.toFixed(2)}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </g>
        ))}
      </svg>

      {/* 四立：三語都用漢字 */}
      {quarters.map((q) => (
        <span
          key={q.name}
          aria-hidden
          lang="zh-Hant"
          style={{ left: pct(q.x), top: pct(q.y) }}
          className="absolute -translate-x-1/2 -translate-y-1/2 font-display text-[13px] tracking-[0.2em] text-ink-3"
        >
          {q.name}
        </span>
      ))}

      {dots.map(({ e, p, x, y }) => (
        <Link
          key={e.href}
          to={e.href!}
          aria-label={e.title}
          data-enso-dot
          onPointerEnter={() => setFocus(e)}
          onPointerLeave={() => setFocus(null)}
          onFocus={() => setFocus(e)}
          onBlur={() => setFocus(null)}
          style={{ left: pct(x), top: pct(y), '--enso-delay': `${(p * secPerSeg).toFixed(3)}s` } as React.CSSProperties}
          className="enso-dot absolute grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center outline-none"
        >
          <BrushDot seed={e.id} size={e.href?.startsWith('/notes') ? 9 : 12} />
        </Link>
      ))}

      {/* 圓心：平常是今年寫了幾篇與目前的節氣；滑過一點換成那一篇 */}
      <div className="absolute inset-[24%] flex flex-col items-center justify-center text-center">
        {focus ? (
          <>
            <p lang="zh-Hant" className="font-display text-[13px] tracking-[0.2em] text-zhu">
              {year[termIndex(new Date(focus.createdAt).getTime())].name}
            </p>
            <p className="mt-2 line-clamp-3 font-display text-lg leading-snug text-ink-1 text-balance">{focus.title}</p>
            <p className="mt-2 text-[12px] text-ink-3 tabular-nums">{siteTime(focus.createdAt).format('YYYY.M.D')}</p>
          </>
        ) : (
          <>
            <p className="text-[13px] tracking-[0.12em] text-ink-3 [:lang(en)_&]:tracking-[0.02em]">{m.home_enso_year()}</p>
            <p className="mt-1 font-display text-ink-2">
              {rich(m.home_enso_count({ count: token('n') }), {
                n: <span className="mx-1 font-display text-5xl text-ink-1 tabular-nums">{written.length}</span>,
              })}
            </p>
            <span aria-hidden className="mt-3 mb-3 block h-px w-24 bg-ink-5" />
            <p className="text-[13px] text-ink-3">
              {rich(m.home_enso_now({ term: token('t') }), {
                t: (
                  <span lang="zh-Hant" className="font-display tracking-[0.12em] text-zhu">
                    {year[cur].name}
                  </span>
                ),
              })}
            </p>
            <Link
              to="/timeline"
              className={cn('pointer-events-auto mt-3 text-[13px] text-ink-2 outline-none transition-colors duration-200', 'hover:text-zhu focus-visible:text-zhu')}
            >
              {m.nav_timeline()} →
            </Link>
          </>
        )}
      </div>
    </div>
  )
}

interface Seg {
  // 寫到今天的那一段（用朱）
  now: boolean
  from: number
  span: number
  paths: { d: string; w: number; o: number }[]
}

const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x))

// 整圈是一筆：幾根平行的筆毛沿著圓走，乾的地方筆毛斷開就是飛白（跟時光頁的乾筆線同一套）。
// 每到新的節氣重新沾墨，濃淡在節氣開頭一小段慢慢換過去，不是一格一格跳。只在今天這個節氣切開，那一段用朱
function strokes(seedYear: number, counts: number[], cur: number, progress: number): Seg[] {
  const base = rng(hash(`enso:${seedYear}`))
  const w1 = base() * Math.PI * 2
  const w2 = base() * Math.PI * 2
  const sway = base() * Math.PI * 2
  // 沾墨：這個節氣寫了幾篇決定一開始多飽；同一節氣往後越乾；沒寫只剩枯筆
  const dip = counts.map((c) => (c ? Math.min(1, 0.34 + (c - 1) * 0.2) : 0))
  const wetIn = (k: number, frac: number) => (dip[k] ? Math.max(0.14, dip[k] * (1 - 0.45 * frac)) : 0.1)
  const wetAt = (s: number) => {
    const k = Math.min(23, Math.floor(s))
    const frac = s - k
    const here = wetIn(k, frac)
    if (k === 0) return Math.max(here, 1 - s / 0.45) // 起筆一團飽墨
    return wetIn(k - 1, 1) + (here - wetIn(k - 1, 1)) * smooth(frac / 0.25)
  }

  const parts = [
    { now: false, from: 0, to: cur },
    { now: true, from: cur, to: progress },
  ].filter((p) => p.to > p.from)
  const out: Seg[] = parts.map((p) => ({ now: p.now, from: p.from, span: p.to - p.from, paths: [] }))

  for (let b = 0; b < BRISTLES; b++) {
    const r = rng(hash(`enso:${seedYear}:${b}`))
    const off = b / (BRISTLES - 1) - 0.5
    const edge = Math.abs(off) * 2
    const middle = b === Math.floor(BRISTLES / 2)
    let on = true
    parts.forEach((part, pi) => {
      let d = ''
      let drawing = false
      let wSum = 0
      let oSum = 0
      let n = 0
      for (let s = part.from; s <= part.to; s += STEP / R / SEG) {
        const wet = wetAt(s)
        // 收筆（寫到今天）收尖
        const tail = Math.min(1, (progress - s) / 0.5)
        // 乾的筆毛斷得多、外側的先乾；中間那根一直在
        const keep = middle ? 1 : 0.3 + 0.7 * wet - edge * 0.35 * (1 - wet)
        if (on && r() < (1 - keep) * 0.12) on = false
        else if (!on && r() < keep * 0.18) on = true
        const a = A0 + s * SEG
        // 起筆藏鋒：一開始窄、很快鋪開
        const head = 0.5 + 0.5 * smooth(s / 0.3)
        const width = (6 + wet * 15) * head * (0.3 + 0.7 * tail) * (1 + Math.sin(sway + s * 2.3) * 0.14)
        const rr = R + Math.sin(a * 2 + w1) * 2.4 + Math.sin(a * 5 + w2) * 0.9 + off * width + (r() - 0.5) * 0.3
        const [x, y] = polar(rr, a)
        if (on || middle) {
          d += `${drawing ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`
          drawing = true
          wSum += width
          oSum += wet
          n++
        } else drawing = false
      }
      if (!d || !n) return
      const w = wSum / n
      const o = oSum / n
      // 筆毛互相疊著才像一道墨，不像幾條平行線；中間那根是筆鋒，乾到底也看得見
      out[pi].paths.push({
        d,
        w: middle ? Math.max(1.6, (w / BRISTLES) * 3) : Math.max(0.8, (w / BRISTLES) * 2.4),
        o: middle ? 0.6 + 0.3 * o : 0.3 + 0.5 * o,
      })
    })
  }
  return out
}
