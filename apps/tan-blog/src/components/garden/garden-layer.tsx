import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { getSolarTerm, type Season } from '@/lib/season'
import { mossTone, rakePattern } from '@/lib/season-spec'
import { HORIZON, ISLAND, ISLAND_SCALE, MOSS_DOTS, STEPPING_STONES, VB_H, VB_W, rakePaths, ringPaths } from './garden-paths'

// 庭的畫層（DESIGN.md 第 0、4 節）：一張水墨的石庭，固定在字層後面、aria-hidden、不攔截操作。
// 全是 SVG，SSR 就有畫面。畫法參考龍安寺石庭的構圖與雪舟的水墨石：
// - 砂：透視壓縮的平行耙紋，往上、往左淡進紙裡；石組周圍繞扁的橢圓水紋
// - 石：低而寬、不規則，淡墨填面，輪廓是粗細不一的斷續筆，內有短皴，頂上點苔
// - 苔島：石組底下一片苔，苔色隨季節
// 筆觸邊緣用 feTurbulence + feDisplacementMap 打毛，像墨在紙上滲開。
// 唯一的 JS：頁尾手動預覽季節時，<html> 的 data-term / data-season 會變，耙紋與苔色跟著換。

interface Term {
  termIndex: number
  season: Season
}

function readTerm(): Term {
  const real = getSolarTerm()
  const root = document.documentElement
  const index = root.dataset.term !== undefined ? Number(root.dataset.term) : NaN
  return {
    termIndex: Number.isFinite(index) ? index : real.index,
    season: (root.dataset.season as Season | undefined) ?? real.season,
  }
}

const RINGS = ringPaths()

// stones=false：只有砂紋、不畫石組（其他列表頁先這樣；砂紋不斷、各寬度都一樣）
// scene：只有砂紋的頁可以加一處點景（最多一處），和石組一樣只在畫面右側有空白時出現
export function GardenLayer({ stones = true, scene }: { stones?: boolean; scene?: 'stepping-stones' }) {
  // 初值一律用真實節氣，與伺服器算出的相同，hydration 才不會對不上
  const [{ termIndex, season }, setTerm] = useState<Term>(() => {
    const real = getSolarTerm()
    return { termIndex: real.index, season: real.season }
  })

  useEffect(() => {
    const sync = () =>
      setTerm((prev) => {
        const next = readTerm()
        return prev.termIndex === next.termIndex && prev.season === next.season ? prev : next
      })
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-term', 'data-season'] })
    return () => observer.disconnect()
  }, [])

  const moss = mossTone(season)
  const pattern = rakePattern(termIndex)
  const rake = useMemo(() => (stones ? rakePaths(pattern) : ''), [stones, pattern])
  const rakeOnly = useMemo(() => rakePaths(pattern, false), [pattern])

  return (
    <div aria-hidden className="garden-layer" style={{ '--moss': `oklch(${moss.l} ${moss.c} ${moss.h})` } as CSSProperties}>
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMaxYMax slice" focusable="false">
        <defs>
          {/* 墨在紙上滲開：筆觸邊緣微微打毛 */}
          <filter id="garden-brush" x="-5%" y="-20%" width="110%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" />
            <feDisplacementMap in="SourceGraphic" scale="3.5" />
          </filter>
          {/* 淡墨面：邊緣化開 */}
          <filter id="garden-brush-fine" x="-2%" y="-10%" width="104%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="2" seed="5" />
            <feDisplacementMap in="SourceGraphic" scale="1.6" />
          </filter>
          <filter id="garden-wash" x="-10%" y="-30%" width="120%" height="160%">
            <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" seed="8" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="9" result="d" />
            <feGaussianBlur in="d" stdDeviation="1.4" />
          </filter>
          {/* 砂往上（遠）、往左淡進紙裡 */}
          <linearGradient id="garden-depth" x1="0" y1={HORIZON} x2="0" y2={VB_H} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="white" stopOpacity="0" />
            <stop offset="0.45" stopColor="white" stopOpacity="0.7" />
            <stop offset="1" stopColor="white" />
          </linearGradient>
          <linearGradient id="garden-side" x1="0" y1="0" x2={VB_W} y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0.15" stopColor="white" stopOpacity="0" />
            <stop offset="0.6" stopColor="white" />
          </linearGradient>
          <mask id="garden-fade-depth" maskUnits="userSpaceOnUse" x="0" y="0" width={VB_W} height={VB_H}>
            <rect width={VB_W} height={VB_H} fill="url(#garden-depth)" />
          </mask>
          <mask id="garden-fade-side" maskUnits="userSpaceOnUse" x="0" y="0" width={VB_W} height={VB_H}>
            <rect width={VB_W} height={VB_H} fill="url(#garden-side)" />
          </mask>
        </defs>

        <g mask="url(#garden-fade-side)">
        <g mask="url(#garden-fade-depth)">
          {stones ? (
            <>
              {/* 寬螢幕（有石組）與窄螢幕（只有砂紋）各一份，由 CSS 決定顯示哪一份 */}
              <path className="garden-rake garden-wide" d={rake} filter="url(#garden-brush-fine)" />
              <path className="garden-rake garden-narrow" d={rakeOnly} filter="url(#garden-brush-fine)" />
              <g className="garden-rake garden-wide" filter="url(#garden-brush-fine)">
                {RINGS.map((d, i) => (
                  <path key={i} d={d} opacity={1 - i * 0.18} />
                ))}
              </g>
            </>
          ) : (
            <path className="garden-rake" d={rakeOnly} filter="url(#garden-brush-fine)" />
          )}
        </g>
        </g>

        {scene === 'stepping-stones' && (
          <g className="garden-wide">
            {STEPPING_STONES.map((s, i) => (
              <g key={i}>
                <path className="garden-stone-wash" filter="url(#garden-wash)" d={s.d} />
                <g className="garden-stone-ink" filter="url(#garden-brush)">
                  <path d={s.near} strokeWidth={s.w} strokeDasharray={`${s.w * 22} ${s.w * 3}`} />
                  <path d={s.far} strokeWidth={s.w * 0.45} strokeOpacity={0.6} />
                </g>
              </g>
            ))}
          </g>
        )}

        {stones && (
        <g className="garden-wide" transform={`translate(${ISLAND.cx} ${ISLAND.cy - 12 * ISLAND_SCALE}) scale(${ISLAND_SCALE})`}>
          {/* 苔島 */}
          <path
            className="garden-moss-wash"
            filter="url(#garden-wash)"
            d="M-292 26C-282 -6 -150 -20 -40 -16C80 -22 214 -10 258 10C290 30 200 50 40 52C-120 56 -296 50 -292 26Z"
          />
          <g className="garden-moss-dot">
            {MOSS_DOTS.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={p.r} />
            ))}
          </g>

          {/* 石是由幾個「面」組成的：輪廓有轉折、不圓；面的交界用折帶皴（先橫後折下的筆）表現 */}
          {/* 小石（左） */}
          <path className="garden-stone-wash" filter="url(#garden-wash)" d="M-240 18L-234 -2L-216 -22L-196 -30L-176 -26L-160 -10L-152 18Z" />
          <path className="garden-stone-shade" filter="url(#garden-wash)" d="M-196 -30L-176 -26L-160 -10L-152 18L-194 18L-192 -6Z" />
          <g className="garden-stone-ink" filter="url(#garden-brush)">
            <path d="M-240 18L-234 -2L-216 -22L-196 -30L-182 -28" strokeWidth={3.2} />
            <path d="M-170 -22L-160 -10L-153 16" strokeWidth={1.8} />
            <path d="M-196 -30L-192 -6L-195 14" strokeWidth={1.5} />
          </g>

          {/* 主石：低而寬，頂部有起伏與轉折 */}
          <path
            className="garden-stone-wash"
            filter="url(#garden-wash)"
            d="M-128 12L-122 -18L-104 -40L-90 -44L-70 -72L-38 -84L-20 -80L4 -98L30 -94L48 -76L74 -70L96 -48L112 -40L126 -14L130 12Z"
          />
          <path className="garden-stone-shade" filter="url(#garden-wash)" d="M30 -94L48 -76L74 -70L96 -48L112 -40L126 -14L130 12L56 12L50 -30L36 -60Z" />
          <g className="garden-stone-ink" filter="url(#garden-brush)">
            {/* 輪廓：受光的左上筆重、右側筆輕，轉折處斷開 */}
            <path d="M-128 12L-122 -18L-104 -40L-90 -44L-70 -72L-40 -84" strokeWidth={4.2} />
            <path d="M-24 -82L4 -98L30 -94L46 -78" strokeWidth={3} />
            <path d="M76 -68L96 -48L112 -40L126 -14L129 10" strokeWidth={2} />
            {/* 折帶皴：面的交界 */}
            <path d="M30 -94L36 -60L50 -30L56 10" strokeWidth={2.4} />
            <path d="M-70 -72L-62 -50L-58 -46L-64 -18" strokeWidth={1.6} />
            <path d="M-38 -84L-30 -62L-8 -58L-4 -40" strokeWidth={1.3} />
            <path d="M84 -58L80 -30L84 -8" strokeWidth={1.2} />
            <path d="M-104 -40L-96 -22" strokeWidth={1.1} />
          </g>
          {/* 苔點：落在石頂 */}
          <g className="garden-stone-dot">
            <ellipse cx={-70} cy={-74} rx={4} ry={2.4} />
            <ellipse cx={-46} cy={-86} rx={3.2} ry={2} />
            <ellipse cx={4} cy={-100} rx={4.2} ry={2.4} />
            <ellipse cx={58} cy={-74} rx={3} ry={1.8} />
            <ellipse cx={-212} cy={-24} rx={3} ry={1.8} />
          </g>

          {/* 小石（右前） */}
          <path className="garden-stone-wash" filter="url(#garden-wash)" d="M148 22L154 10L170 2L190 4L200 14L204 24Z" />
          <g className="garden-stone-ink" filter="url(#garden-brush)">
            <path d="M148 22L154 10L170 2L188 4" strokeWidth={2.4} />
            <path d="M190 4L200 14L203 22" strokeWidth={1.4} />
          </g>
        </g>
        )}
      </svg>
    </div>
  )
}
