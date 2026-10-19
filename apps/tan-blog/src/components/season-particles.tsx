import { useEffect, useRef } from 'react'
import { SEASONS, type Season } from '@/lib/season'

// 依 <html data-season> 在背景畫當季的飄落物：春桃瓣、夏螢火、秋楓葉、冬雪。
// - canvas 固定在內容之下（z-index -1），pointer-events 關閉，不影響閱讀與點擊
// - 分頁不可見時暫停；prefers-reduced-motion 時完全不畫
// - 監聽 data-season 變化（頁尾的季節切換），即時換成新的粒子

interface Particle {
  x: number
  y: number
  size: number
  vx: number
  vy: number
  angle: number
  spin: number
  phase: number
  color: string
}

const COLORS: Record<Season, string[]> = {
  spring: ['#f6c6d2', '#f2b3c4', '#fadbe3', '#efa9bd'],
  summer: ['#e9f7a1', '#d4f08a', '#f4fbc0'],
  autumn: ['#c8553d', '#d9783f', '#b8432f', '#e09a4b'],
  winter: ['#ffffff', '#eef4ff', '#dfe9f7'],
}

const rand = (min: number, max: number) => min + Math.random() * (max - min)
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]

function spawn(season: Season, w: number, h: number, initial: boolean): Particle {
  const base = {
    x: rand(0, w),
    angle: rand(0, Math.PI * 2),
    phase: rand(0, Math.PI * 2),
    color: pick(COLORS[season]),
  }
  switch (season) {
    case 'summer':
      // 螢火蟲：集中在畫面下半部緩慢遊走
      return { ...base, y: rand(h * 0.35, h), size: rand(1.2, 2.4), vx: rand(-0.15, 0.15), vy: rand(-0.12, 0.08), spin: rand(0.01, 0.03) }
    case 'winter':
      return { ...base, y: initial ? rand(0, h) : rand(-40, -10), size: rand(1, 3.2), vx: rand(-0.2, 0.2), vy: rand(0.35, 0.9), spin: rand(0.005, 0.015) }
    case 'autumn':
      return { ...base, y: initial ? rand(0, h) : rand(-40, -10), size: rand(9, 15), vx: rand(-0.3, 0.3), vy: rand(0.5, 1.1), spin: rand(-0.025, 0.025) }
    default:
      return { ...base, y: initial ? rand(0, h) : rand(-40, -10), size: rand(4, 7), vx: rand(0.1, 0.5), vy: rand(0.35, 0.8), spin: rand(-0.03, 0.03) }
  }
}

function drawPetal(ctx: CanvasRenderingContext2D, p: Particle) {
  ctx.rotate(p.angle)
  ctx.scale(1, Math.max(0.25, Math.abs(Math.cos(p.phase))))
  ctx.beginPath()
  // 桃花瓣：一端圓、一端帶小缺口
  ctx.moveTo(0, -p.size)
  ctx.bezierCurveTo(p.size * 0.9, -p.size * 0.6, p.size * 0.7, p.size * 0.8, 0, p.size)
  ctx.bezierCurveTo(-p.size * 0.7, p.size * 0.8, -p.size * 0.9, -p.size * 0.6, 0, -p.size)
  ctx.fillStyle = p.color
  ctx.globalAlpha = 0.75
  ctx.fill()
}

function drawLeaf(ctx: CanvasRenderingContext2D, p: Particle) {
  ctx.rotate(p.angle)
  // 以 cos 壓扁 X 軸，模擬葉片在空中翻轉
  ctx.scale(Math.cos(p.phase), 1)
  const s = p.size
  ctx.beginPath()
  // 簡化的五裂楓葉輪廓
  const points = 5
  for (let i = 0; i <= points * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / points
    const r = i % 2 === 0 ? s : s * 0.55
    const x = Math.cos(a) * r
    const y = Math.sin(a) * r
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fillStyle = p.color
  ctx.globalAlpha = 0.7
  ctx.fill()
  // 葉柄
  ctx.beginPath()
  ctx.moveTo(0, s * 0.3)
  ctx.lineTo(0, s * 1.2)
  ctx.strokeStyle = p.color
  ctx.lineWidth = 1
  ctx.stroke()
}

function drawSnow(ctx: CanvasRenderingContext2D, p: Particle) {
  ctx.beginPath()
  ctx.arc(0, 0, p.size, 0, Math.PI * 2)
  ctx.fillStyle = p.color
  ctx.globalAlpha = 0.35 + p.size * 0.12
  ctx.fill()
}

function drawFirefly(ctx: CanvasRenderingContext2D, p: Particle) {
  const glow = 0.35 + 0.65 * Math.max(0, Math.sin(p.phase))
  const r = p.size * 6
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r)
  g.addColorStop(0, p.color)
  g.addColorStop(0.2, p.color + '88')
  g.addColorStop(1, p.color + '00')
  ctx.globalAlpha = glow
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()
}

const DRAW: Record<Season, (ctx: CanvasRenderingContext2D, p: Particle) => void> = {
  spring: drawPetal,
  summer: drawFirefly,
  autumn: drawLeaf,
  winter: drawSnow,
}

const currentSeason = (): Season => {
  const s = document.documentElement.dataset.season as Season | undefined
  return s && SEASONS.includes(s) ? s : 'autumn'
}

export function SeasonParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    let season = currentSeason()
    let particles: Particle[] = []
    let w = 0
    let h = 0
    let frame = 0

    const count = () => {
      const base = season === 'winter' ? 60 : season === 'summer' ? 22 : 26
      return Math.round(base * (w < 640 ? 0.5 : 1))
    }
    const reseed = () => {
      particles = Array.from({ length: count() }, () => spawn(season, w, h, true))
    }
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      reseed()
    }

    const tick = () => {
      ctx.clearRect(0, 0, w, h)
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        p.phase += p.spin * 2
        p.angle += p.spin
        if (season === 'summer') {
          p.x += p.vx + Math.sin(p.phase) * 0.2
          p.y += p.vy + Math.cos(p.phase * 0.7) * 0.15
          if (p.x < -20 || p.x > w + 20 || p.y < h * 0.25 || p.y > h + 20) particles[i] = spawn(season, w, h, true)
        } else {
          p.x += p.vx + Math.sin(p.phase) * (season === 'winter' ? 0.3 : 0.6)
          p.y += p.vy
          if (p.y > h + 30 || p.x < -40 || p.x > w + 40) particles[i] = spawn(season, w, h, false)
        }
        ctx.save()
        ctx.translate(p.x, p.y)
        DRAW[season](ctx, particles[i])
        ctx.restore()
      }
      frame = requestAnimationFrame(tick)
    }

    const start = () => {
      cancelAnimationFrame(frame)
      if (!document.hidden) frame = requestAnimationFrame(tick)
    }

    resize()
    start()

    const observer = new MutationObserver(() => {
      const next = currentSeason()
      if (next !== season) {
        season = next
        reseed()
      }
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-season'] })
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', start)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', start)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
    />
  )
}
