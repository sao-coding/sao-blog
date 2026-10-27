import { useId, useMemo, useState, type CSSProperties } from 'react'
import { Link } from '@tanstack/react-router'
import type { InferClientOutputs } from '@orpc/client'
import type { client } from '@/lib/orpc'
import { m } from '@/paraglide/messages'
import { SEASONS, type Season } from '@/lib/season'
import {
  bucketByTerm,
  daysUntil,
  KO_NAMES,
  latestSeasonYear,
  seasonOfTerm,
  seasonSlots,
  termAt,
  termKey,
  type TermSlot,
} from '@/lib/saijiki'
import { siteTime } from '@/lib/site-time'
import { inkDryness } from '@/lib/season-spec'
import { BRANCH_SHADOW, brushUnderlinePath, PANE_H, PANE_W, panePaths, railPath } from './shoji-paths'

type HomeData = InferClientOutputs<typeof client>['home']['getHome']['data']
type TimelineItem = HomeData['timeline']['items'][number]
type Musing = HomeData['musings'][number]

// 障子後面列出的一則：文章、筆記照時間線；碎念只有首頁 API 給的最新幾則
type Entry =
  | { kind: 'post' | 'note'; id: string; text: string; href: string; createdAt: string }
  | { kind: 'musing'; id: string; text: string; noteId: string | null; createdAt: string }

const KIND_LABEL = { post: m.home_kind_post, note: m.home_kind_note, musing: m.home_kind_musing }

// 滑過時標題下一筆朱色手繪線（起筆頓、收筆出鋒），由左往右掃出來
function BrushUnderline({ seed }: { seed: number }) {
  const d = useMemo(() => brushUnderlinePath(seed), [seed])
  return (
    <svg viewBox="0 0 300 8" preserveAspectRatio="none" className="brush-underline" aria-hidden>
      <path d={d} />
    </svg>
  )
}

const SEASON_LABEL: Record<Season, () => string> = {
  spring: m.season_spring,
  summer: m.season_summer,
  autumn: m.season_autumn,
  winter: m.season_winter,
}
const KO_LABEL = [m.home_ko_first, m.home_ko_second, m.home_ko_last]

// 首頁 hero 以下：障子曆（DESIGN.md「歲時記」、REDESIGN-PLAN 階段 10）。
// 一季六個節氣是六扇障子，乾筆墨線畫在頁面的紙上；拉開一扇看那個節氣寫了什麼。
// 晝：窗外一枝楓的影子透在紙上；夜：有寫東西的節氣窗裡點著燈，寫得越多越亮。
export function ShojiCalendar({ items, musings }: { items: TimelineItem[]; musings: Musing[] }) {
  const id = useId().replace(/:/g, '')
  const now = useMemo(() => new Date(), [])
  const cur = useMemo(() => termAt(now), [now])
  // 障子上的燈與數字只算文章與筆記；碎念混在下面的列表裡
  const buckets = useMemo(() => bucketByTerm(items), [items])
  const entries = useMemo(
    () =>
      bucketByTerm<Entry>([
        ...items.map((it) => ({ kind: it.type, id: `${it.type}-${it.id}`, text: it.title, href: it.href, createdAt: it.createdAt })),
        ...musings.map((it) => ({
          kind: 'musing' as const,
          id: `musing-${it.id}`,
          text: it.content,
          noteId: it.note?.id ?? null,
          createdAt: it.createdAt,
        })),
      ]),
    [items, musings]
  )

  const [season, setSeason] = useState<Season>(seasonOfTerm(cur.index))
  const slots = useMemo(() => seasonSlots(season, latestSeasonYear(season, now)), [season, now])
  const [open, setOpen] = useState<string | null>(termKey(cur))

  const pickSeason = (s: Season) => {
    setSeason(s)
    // 換季時拉開那一季最近一個有寫東西的節氣
    const list = seasonSlots(s, latestSeasonYear(s, now))
    const latest = [...list].reverse().find((it) => it.start <= now.getTime() && entries.has(termKey(it)))
    setOpen(latest ? termKey(latest) : null)
  }

  const openSlot = slots.find((s) => termKey(s) === open)

  return (
    <section aria-label={m.home_saijiki_label()} className="mx-auto w-full max-w-4xl px-5">
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 font-wenkai">
        <p className="text-sm md:text-base">
          {cur.name}
          <span className="text-ink">
            {'　'}
            {KO_LABEL[cur.ko]()} {KO_NAMES[cur.index][cur.ko]}
          </span>
          <span className="text-xs text-muted-foreground md:text-sm">
            {'　'}
            {m.home_saijiki_until({ next: cur.next.name, days: daysUntil(cur.end, now) })}
          </span>
        </p>
        <div role="group" aria-label={m.home_saijiki_seasons()} className="flex gap-1 text-sm">
          {SEASONS.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={s === season}
              onClick={() => pickSeason(s)}
              className={`px-1.5 py-0.5 transition-colors ${
                s === season ? 'text-ink' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {SEASON_LABEL[s]()}
            </button>
          ))}
        </div>
      </header>

      <div className="shoji-wall relative">
        <svg viewBox="0 0 600 12" preserveAspectRatio="none" className="block h-2.5 w-full md:h-3" aria-hidden>
          <path d={railPath(41, 4.4)} className="fill-foreground opacity-75" />
        </svg>

        <div className="relative overflow-hidden">
          {/* 障子後面：晝是空的紙，夜是房裡暈開的燈；拉開時從縫裡看到 */}
          <svg
            viewBox="0 0 600 210"
            preserveAspectRatio="none"
            className="shoji-behind pointer-events-none absolute inset-0 h-full w-full"
            aria-hidden
          >
            <ellipse cx="300" cy="140" rx="230" ry="60" filter={`url(#${id}-wash)`} />
          </svg>

          <div className="relative flex">
            {slots.map((s, i) => (
              <Pane
                key={termKey(s)}
                id={id}
                slot={s}
                i={i}
                count={buckets.get(termKey(s))?.length ?? 0}
                future={s.start > now.getTime()}
                current={termKey(s) === termKey(cur)}
                open={termKey(s) === open}
                onToggle={() => setOpen((o) => (o === termKey(s) ? null : termKey(s)))}
              />
            ))}
          </div>
        </div>

        <svg viewBox="0 0 600 12" preserveAspectRatio="none" className="block h-2.5 w-full md:h-3" aria-hidden>
          <path d={railPath(57, 3.8)} className="fill-foreground opacity-70" />
        </svg>

        <div className="flex font-wenkai">
          {slots.map((s) => {
            const count = buckets.get(termKey(s))?.length ?? 0
            const isCur = termKey(s) === termKey(cur)
            const isOpen = termKey(s) === open
            return (
              <div key={termKey(s)} aria-hidden className="flex-1 pt-2 text-center">
                <div
                  className={`text-xs md:text-sm ${
                    isCur ? 'text-ink' : isOpen || count ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {s.name}
                </div>
                <div className={`font-mono text-[11px] ${count ? 'text-foreground/70' : 'text-muted-foreground/60'}`}>
                  {s.start > now.getTime() ? '' : count || '—'}
                </div>
              </div>
            )
          })}
        </div>

        <svg className="absolute size-0" aria-hidden>
          <defs>
            <filter id={`${id}-wash`} x="-60%" y="-60%" width="220%" height="220%">
              <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={3} seed={7} />
              <feDisplacementMap in="SourceGraphic" scale={34} />
              <feGaussianBlur stdDeviation={6} />
            </filter>
            <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
              <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves={2} seed={11} />
              <feDisplacementMap in="SourceGraphic" scale={10} />
              <feGaussianBlur stdDeviation={11} />
            </filter>
            <filter id={`${id}-dry`}>
              <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves={2} seed={3} />
              <feDisplacementMap in="SourceGraphic" scale={1.6} />
            </filter>
            <filter id={`${id}-shadow`}>
              <feGaussianBlur stdDeviation={1.8} />
            </filter>
            <clipPath id={`${id}-pane`}>
              <rect x="2" y="2" width={PANE_W - 4} height={PANE_H - 4} />
            </clipPath>
          </defs>
        </svg>
      </div>

      {/* 拉開的那個節氣寫了什麼：依三候（各約五天）分組，文章、筆記、碎念照時間混在一起 */}
      <div className="mt-10 min-h-32 font-wenkai" aria-live="polite">
        {openSlot && (
          <TermEntries key={termKey(openSlot)} slot={openSlot} entries={entries.get(termKey(openSlot)) ?? []} cur={cur} />
        )}
        <Link
          to="/timeline"
          className="mt-6 inline-block border-t border-rule pt-3 text-sm text-muted-foreground transition-colors hover:text-ink"
        >
          {m.home_saijiki_more()}
        </Link>
      </div>
    </section>
  )
}

function TermEntries({
  slot,
  entries,
  cur,
}: {
  slot: TermSlot
  entries: (Entry & { ko: 0 | 1 | 2 })[]
  cur: { year: number; index: number; ko: number }
}) {
  const isCurTerm = slot.year === cur.year && slot.index === cur.index
  const sorted = [...entries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  let row = 0
  return (
    <>
      <p data-rise className="mb-2 flex items-baseline gap-3" style={{ '--i': row++ } as CSSProperties}>
        <span className="text-xl tracking-[0.2em] md:text-2xl">{slot.name}</span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {siteTime(new Date(slot.start)).format('M/D')}–{siteTime(new Date(slot.end - 1)).format('M/D')}
        </span>
      </p>
      {([0, 1, 2] as const).map((ko) => {
        const list = sorted.filter((e) => e.ko === ko)
        const isCurKo = isCurTerm && ko === cur.ko
        const future = isCurTerm && ko > cur.ko
        return (
          <section
            key={ko}
            data-rise
            style={{ '--i': row++ } as CSSProperties}
            className={`grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-4 border-t border-rule py-3 md:grid-cols-[6.5rem_minmax(0,1fr)] md:gap-x-6 ${
              future ? 'opacity-50' : ''
            }`}
          >
            <h3 className={`pt-0.5 text-xs leading-relaxed md:text-sm ${isCurKo ? 'text-ink' : 'text-muted-foreground'}`}>
              {KO_LABEL[ko]()}
              <br />
              <span className={isCurKo ? 'text-ink' : 'text-foreground/80'}>{KO_NAMES[slot.index][ko]}</span>
            </h3>
            {list.length ? (
              <ul>
                {list.map((e) => (
                  <EntryRow key={e.id} entry={e} />
                ))}
              </ul>
            ) : (
              <p className="pt-0.5 text-sm text-muted-foreground/70">
                {isCurKo ? m.home_ko_ongoing() : future ? m.home_ko_future() : '—'}
              </p>
            )}
          </section>
        )
      })}
    </>
  )
}

function EntryRow({ entry: e }: { entry: Entry }) {
  const date = (
    <span className="ml-3 font-mono text-[11px] whitespace-nowrap text-muted-foreground">
      {KIND_LABEL[e.kind]()} {siteTime(e.createdAt).format('M/D')}
    </span>
  )
  if (e.kind === 'musing') {
    return (
      <li className="py-1">
        <Link
          {...(e.noteId ? { to: '/notes/$id', params: { id: e.noteId } } : { to: '/thinking' })}
          className="brush-link text-sm text-muted-foreground transition-colors hover:text-foreground md:text-[15px]"
        >
          「{e.text}」
          <BrushUnderline seed={e.text.length} />
        </Link>
        {date}
      </li>
    )
  }
  return (
    <li className={`ink-row ink-${inkDryness(e.createdAt)} py-1`}>
      <Link to={e.href} className="brush-link ink-title text-base leading-snug md:text-lg">
        {e.text}
        <BrushUnderline seed={e.text.length} />
      </Link>
      {date}
    </li>
  )
}

interface PaneProps {
  id: string
  slot: TermSlot
  i: number
  count: number
  future: boolean
  current: boolean
  open: boolean
  onToggle: () => void
}

function Pane({ id, slot, i, count, future, current, open, onToggle }: PaneProps) {
  const paths = useMemo(() => panePaths(slot.index), [slot.index])
  const lamp = Math.min(count, 3)
  return (
    <button
      type="button"
      disabled={future}
      aria-pressed={open}
      aria-label={future ? m.home_saijiki_future({ term: slot.name }) : m.home_saijiki_pane({ term: slot.name, count })}
      onClick={onToggle}
      className="shoji-slot relative min-w-0 flex-1 cursor-pointer disabled:cursor-default"
      data-open={open || undefined}
    >
      <svg
        viewBox={`0 0 ${PANE_W} ${PANE_H}`}
        className="shoji-pane block h-auto w-full"
        data-dir={i === 5 ? 'left' : 'right'}
        data-lit={lamp || undefined}
        data-future={future || undefined}
        data-current={current || undefined}
        aria-hidden
      >
        <rect width={PANE_W} height={PANE_H} className="fill-background" />
        {lamp > 0 && (
          <g clipPath={`url(#${id}-pane)`} className="shoji-lamp" filter={`url(#${id}-glow)`}>
            {/* 燈在紙後：一圈大而淡的暈，中間一團亮一點的芯 */}
            <ellipse cx={PANE_W / 2} cy={PANE_H * 0.6} rx={PANE_W * 0.55} ry={PANE_H * (0.34 + lamp * 0.05)} opacity={0.18 + lamp * 0.08} />
            <ellipse cx={PANE_W / 2} cy={PANE_H * 0.64} rx={PANE_W * 0.24} ry={PANE_H * (0.14 + lamp * 0.03)} opacity={0.3 + lamp * 0.12} />
          </g>
        )}
        <g clipPath={`url(#${id}-pane)`} filter={`url(#${id}-shadow)`} className="shoji-shadow">
          <g className="shoji-sway">
            <g transform={`translate(${-i * PANE_W},0)`}>
              <path d={BRANCH_SHADOW.branch} />
              <path d={BRANCH_SHADOW.twig} />
              {BRANCH_SHADOW.leaves.map((l, k) => (
                <path key={k} d={l.d} transform={l.transform} />
              ))}
            </g>
          </g>
        </g>
        <g filter={`url(#${id}-dry)`} className="shoji-kumiko">
          {paths.kumiko.map((d, k) => (
            <path key={k} d={d} />
          ))}
        </g>
        <g filter={`url(#${id}-dry)`} className="shoji-frame">
          {paths.frame.map((d, k) => (
            <path key={k} d={d} />
          ))}
        </g>
      </svg>
    </button>
  )
}
