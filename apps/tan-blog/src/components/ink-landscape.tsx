import { useEffect, useRef, type CSSProperties } from 'react'
import { afterLoadIdle } from '@/lib/after-load'
import { SeasonParticles } from '@/components/season-particles'

// 首頁主視覺：夢州夜色的水墨山水。
// - 五層由遠到近的山稜，水墨畫「稜線濃、山腳化入霧氣」的畫法：每層用由上而下淡出的漸層
// - 山層之間夾著緩慢漂移的霧帶；捲動時各層位移速度不同，產生景深
// - 天空只有少量靜態星點（部分微微閃爍）與從山谷升起的燈籠（呼應「蜃雲燈影」）
// - 季節粒子只出現在這裡，不再撒滿全站
// 所有圖形都由程式產生，顏色全部來自季節變數（見 styles.css 的 .ink-landscape）。

// 固定種子的亂數：SSR 與瀏覽器算出完全相同的山形與星點，不會 hydration mismatch
function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

const W = 1600
const H = 600

// 中點位移法產生一條自然的山稜線；peaks 再疊上幾座高峰（x、高度、寬度皆為比例），
// 讓兩側有主峰框住畫面、中間留出谷地與霧
type Peak = { x: number; height: number; width: number }
function ridgePath(seed: number, baseY: number, amplitude: number, roughness: number, peaks: Peak[] = []) {
  const rand = seeded(seed)
  const n = 128
  const ys = new Array<number>(n + 1).fill(0)
  ys[0] = (rand() - 0.5) * amplitude
  ys[n] = (rand() - 0.5) * amplitude
  let step = n
  let amp = amplitude
  while (step > 1) {
    const half = step / 2
    for (let i = half; i < n; i += step) {
      ys[i] = (ys[i - half] + ys[i + half]) / 2 + (rand() - 0.5) * amp
    }
    amp *= roughness
    step = half
  }
  const pts = ys.map((y, i) => {
    const x = i / n
    // 高峰用高斯曲線疊加，峰頂略尖、山腳緩
    const lift = peaks.reduce((sum, p) => sum + p.height * Math.exp(-((x - p.x) ** 2) / (2 * p.width ** 2)), 0)
    return `${(x * W).toFixed(1)},${(baseY + y - lift).toFixed(1)}`
  })
  return `M0,${H} L${pts.join(' L')} L${W},${H} Z`
}

// 由遠到近：基準高度越來越低（越靠近畫面下方）、起伏越來越大
// 山只佔主視覺底部約三分之一，當作「遠山淡影」點綴，不搶文字與月亮
const LAYERS = [
  { d: ridgePath(11, 360, 80, 0.48, [{ x: 0.76, height: 110, width: 0.07 }]), parallax: 0.05 },
  { d: ridgePath(23, 400, 90, 0.48, [{ x: 0.12, height: 120, width: 0.07 }]), parallax: 0.1 },
  { d: ridgePath(37, 445, 80, 0.5, [{ x: 0.92, height: 100, width: 0.07 }]), parallax: 0.16 },
  { d: ridgePath(41, 495, 70, 0.52, [{ x: 0.04, height: 80, width: 0.08 }]), parallax: 0.24 },
  { d: ridgePath(59, 550, 50, 0.52), parallax: 0.34 },
]

const STARS = (() => {
  const rand = seeded(7)
  return Array.from({ length: 70 }, (_, i) => ({
    x: rand() * 100,
    y: rand() * 48,
    r: rand() * 1.1 + 0.4,
    twinkle: i % 6 === 0,
    delay: rand() * 6,
  }))
})()

const LANTERNS = (() => {
  const rand = seeded(97)
  return Array.from({ length: 7 }, () => ({
    left: 8 + rand() * 84,
    size: 0.6 + rand() * 0.6,
    duration: 26 + rand() * 22,
    delay: -rand() * 40,
    sway: 10 + rand() * 24,
  }))
})()

export function InkLandscape() {
  const rootRef = useRef<HTMLDivElement>(null)

  // 燈籠、霧、星星的 CSS 動畫先暫停，頁面載入完、主執行緒空下來才開始（見 styles.css 的 .is-live）
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    return afterLoadIdle(() => root.classList.add('is-live'))
  }, [])

  // 捲動視差：只更新 CSS 變數，各層自己用 calc 算位移
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const root = rootRef.current
    if (!root) return
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const y = Math.min(window.scrollY, window.innerHeight)
        root.style.setProperty('--scroll', String(y))
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
    <div ref={rootRef} aria-hidden className="ink-landscape">
      {/* 星點 */}
      <svg className="ink-stars" viewBox="0 0 100 100" preserveAspectRatio="none">
        {STARS.map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.r * 0.08}
            className={s.twinkle ? 'ink-star-twinkle' : undefined}
            style={s.twinkle ? { animationDelay: `${s.delay}s` } : undefined}
          />
        ))}
      </svg>

      {/* 燈籠：從山谷緩慢升起，左右輕晃，越高越淡 */}
      <div className="ink-lanterns">
        {LANTERNS.map((l, i) => (
          <span
            key={i}
            className="ink-lantern"
            style={
              {
                left: `${l.left}%`,
                '--size': l.size,
                '--sway': `${l.sway}px`,
                animationDuration: `${l.duration}s`,
                animationDelay: `${l.delay}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      {/* 山與霧：每層山後面接一條霧帶 */}
      {LAYERS.map((layer, i) => {
        const t = i / (LAYERS.length - 1)
        return (
          <div
            key={i}
            className="ink-layer"
            style={{ '--parallax': layer.parallax, '--t': t, zIndex: i * 2 + 1 } as CSSProperties}
          >
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice">
              <defs>
                <linearGradient id={`ink-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" className="ink-stop-ridge" />
                  <stop offset="100%" className="ink-stop-foot" />
                </linearGradient>
              </defs>
              <path d={layer.d} fill={`url(#ink-grad-${i})`} />
            </svg>
            {i < LAYERS.length - 1 && <div className="ink-mist" style={{ animationDelay: `${-i * 13}s` }} />}
          </div>
        )
      })}

      {/* 季節飄落物（只在主視覺） */}
      <div className="absolute inset-0 z-20">
        <SeasonParticles />
      </div>

      {/* 底部融入頁面背景 */}
      <div className="ink-fade" />
    </div>
  )
}
