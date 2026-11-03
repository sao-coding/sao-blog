// 時間線左邊「一筆寫到乾的線」（2026-11-02 站主同意的設計）：
// - 一個節氣是一筆。每到一個新的節氣毛筆重新沾墨：那個節氣寫得多，那一筆就飽、黑、粗；寫得少就乾、細，露出飛白。
//   同一個節氣裡越往下（越早寫的）墨越乾。中間有整個節氣一篇都沒寫，那一段只剩幾絲枯筆。
// - 每一篇是一個書法的「、」（BrushDot），不是圓點；文章大一點、日記小一點；滑過那一列點轉朱（styles.css「時間線」）。
// 線用 SVG 畫好幾根平行的「筆毛」，乾的地方筆毛隨機斷開就是飛白；位置量每一個點的中心（換頁、視窗改大小時重量）。
// 形狀由年份與每一篇的 id 決定，每次畫出來一樣。只用 --foreground 的墨，晝夜跟著換。
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { getSolarTerm, localYmd } from '@/lib/season'

const BRISTLES = 7
const STEP = 3

export function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

export function rng(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), a | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 節氣的順序號：一月初還在前一年的冬至、小寒前的那幾天算成負的，才排得進同一年 */
export function termOrdinal(date: Date | string) {
  const d = new Date(date)
  const { month } = localYmd(d)
  const { index } = getSolarTerm(d)
  return index > month * 2 - 1 ? index - 24 : index
}

/** 一個「、」：頭圓、往右下收尖。rotate／scale 由 seed 決定，每一點都有一點不一樣 */
export function BrushDot({ seed, size }: { seed: string; size: number }) {
  const r = rng(hash(seed))
  const rot = -18 + r() * 30
  const s = 0.88 + r() * 0.24
  return (
    <svg aria-hidden viewBox="0 0 20 20" width={size} height={size} className="tl-dot">
      <path
        transform={`rotate(${rot.toFixed(1)} 10 10) scale(${s.toFixed(2)}) translate(${(10 / s - 10).toFixed(2)} ${(10 / s - 10).toFixed(2)})`}
        d="M5.2 4.6C8.4 3.2 13.6 6.6 14.8 11.2C15.6 14.4 13.4 16.6 11.2 15.4C9 14.2 8.4 10.8 6.6 8.2C5.6 6.8 3.8 5.4 5.2 4.6Z"
      />
    </svg>
  )
}

export interface LineEntry {
  id: string
  createdAt: Date | string
}

/**
 * 包住一年的列表：左邊留一條欄位畫線，裡面每一列要放一個帶 data-tl-dot（＝那一篇 id）的點。
 * entries 是新→舊的順序（跟畫面一樣）。
 */
export function BrushLine({ year, entries, children }: { year: number; entries: LineEntry[]; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null)
  const [ys, setYs] = useState<number[] | null>(null)

  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => {
      const top = el.getBoundingClientRect().top
      const pos = [...el.querySelectorAll<HTMLElement>('[data-tl-dot]')].map((d) => {
        const r = d.getBoundingClientRect()
        return r.top + r.height / 2 - top
      })
      setYs((prev) => (prev && prev.length === pos.length && prev.every((v, i) => Math.abs(v - pos[i]) < 0.5) ? prev : pos))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [entries])

  // 捲到這一年才由上往下寫出來：線從上面露出、每一點在筆經過時落下（styles.css「時間線」）。
  // 寫的時間跟這一年有多長成正比；減少動態效果就直接是寫好的。只寫一次
  useLayoutEffect(() => {
    const el = box.current
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const h = el.offsetHeight
    const dur = Math.min(3.6, 0.9 + h / 700)
    el.style.setProperty('--tl-dur', `${dur}s`)
    const top = el.getBoundingClientRect().top
    for (const d of el.querySelectorAll<HTMLElement>('[data-tl-dot]')) {
      const y = d.getBoundingClientRect().top - top
      d.style.setProperty('--tl-delay', `${((y / Math.max(1, h)) * dur).toFixed(2)}s`)
    }
    el.dataset.tl = 'pending'
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        el.dataset.tl = 'written'
        io.disconnect()
      },
      { rootMargin: '0px 0px -15% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [entries])

  return (
    <div ref={box} className="tl-box relative pl-8 sm:pl-10">
      {ys && ys.length === entries.length && <Strokes year={year} entries={entries} ys={ys} />}
      {children}
    </div>
  )
}

function Strokes({ year, entries, ys }: { year: number; entries: LineEntry[]; ys: number[] }) {
  const terms = entries.map((e) => termOrdinal(e.createdAt))
  const count = new Map<number, number>()
  for (const t of terms) count.set(t, (count.get(t) ?? 0) + 1)
  // 同一個節氣裡排第幾篇（往下越乾）
  const nth = terms.map((t, i) => terms.slice(0, i).filter((u) => u === t).length)

  const height = ys.at(-1)! + 18
  const x = 0 // 線的中心在欄位中間，畫在 translate 之後
  const paths: { d: string; w: number; o: number }[] = []

  // 第 i 段：從第 i 篇的點畫到第 i+1 篇（最後一篇往下再拖一小段收筆）
  for (let i = 0; i < ys.length; i++) {
    const y0 = i === 0 ? Math.max(0, ys[0] - 14) : ys[i]
    const y1 = i + 1 < ys.length ? ys[i + 1] : ys[i] + 18
    const t = terms[i]
    const next = i + 1 < ys.length ? terms[i + 1] : t
    const skipped = t - next > 1
    // 沾墨：這個節氣寫了幾篇決定一開始多飽；同一節氣往下越乾
    const dip = Math.min(1, 0.3 + (count.get(t)! - 1) * 0.22)
    const frac = count.get(t)! > 1 ? nth[i] / (count.get(t)! - 1) : 0
    const wet = skipped ? 0.06 : Math.max(0.12, dip * (1 - 0.45 * frac))
    const width = 1.2 + wet * 4
    const r = rng(hash(`${year}:${entries[i].id}`))
    // 整筆的寬度順著筆勢慢慢變（不是每一格亂跳）
    const sway = r() * Math.PI * 2
    for (let b = 0; b < BRISTLES; b++) {
      const base = b / (BRISTLES - 1) - 0.5
      // 乾的筆毛斷得多、最外側的先乾；中間那根永遠在，乾到底也留一條細線
      const edge = Math.abs(base) * 2
      const keep = b === Math.floor(BRISTLES / 2) ? 1 : 0.35 + 0.65 * wet - edge * 0.3 * (1 - wet)
      // 飛白是順著筆勢的長條：斷了就斷一長段，接上也接一長段
      let on = r() < keep
      let d = ''
      let drawing = false
      for (let y = y0; y <= y1; y += STEP) {
        if (on && r() < (1 - keep) * 0.12) on = false
        else if (!on && r() < keep * 0.2) on = true
        const swell = 1 + Math.sin(sway + y / 23) * 0.18
        const px = x + base * width * swell + (r() - 0.5) * 0.25
        if (on) {
          d += `${drawing ? 'L' : 'M'}${px.toFixed(2)} ${y.toFixed(1)}`
          drawing = true
        } else drawing = false
      }
      if (d) paths.push({ d, w: Math.max(0.6, (width / BRISTLES) * 1.7), o: 0.4 + 0.5 * wet })
    }
  }

  return (
    <svg
      aria-hidden
      className="tl-line pointer-events-none absolute top-0 left-0 w-8 overflow-visible text-foreground sm:w-10"
      height={height}
    >
      <g className="translate-x-4 sm:translate-x-5">
        {paths.map((p, i) => (
          <path key={i} d={p.d} fill="none" stroke="currentColor" strokeOpacity={p.o} strokeWidth={p.w} strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </g>
    </svg>
  )
}
