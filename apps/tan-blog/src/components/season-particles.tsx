import { useEffect, useRef } from 'react'
import { TERM_THEMES, type ParticleKind, type ParticleMix } from '@/lib/term-themes'

// 依目前節氣在父元素範圍內畫飄落物：梅、桃、櫻、油桐、鳳凰花、螢火、荷、桂、欒樹、楓、銀杏、雪、雨。
// - 讀 <html data-term>，並監聽它變化（頁尾的季節切換）即時更新
// - 填滿父元素、pointer-events 關閉；分頁隱藏時暫停；prefers-reduced-motion 時不繪製

type Motion = 'fall' | 'wander' | 'rain'

interface Particle {
  kind: ParticleKind
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

interface Element {
  colors: string[]
  size: [number, number]
  motion: Motion
  speed: [number, number]
  draw: (ctx: CanvasRenderingContext2D, p: Particle) => void
}

const TAU = Math.PI * 2

// 一片花瓣：一端圓、一端略尖，notch 時尖端有小缺口（櫻）
function petal(ctx: CanvasRenderingContext2D, s: number, notch = false) {
  ctx.beginPath()
  if (notch) {
    ctx.moveTo(-s * 0.22, -s * 0.85)
    ctx.lineTo(0, -s * 0.62)
    ctx.lineTo(s * 0.22, -s * 0.85)
    ctx.bezierCurveTo(s * 0.9, -s * 0.5, s * 0.7, s * 0.8, 0, s)
    ctx.bezierCurveTo(-s * 0.7, s * 0.8, -s * 0.9, -s * 0.5, -s * 0.22, -s * 0.85)
  } else {
    ctx.moveTo(0, -s)
    ctx.bezierCurveTo(s * 0.9, -s * 0.6, s * 0.7, s * 0.8, 0, s)
    ctx.bezierCurveTo(-s * 0.7, s * 0.8, -s * 0.9, -s * 0.6, 0, -s)
  }
  ctx.fill()
}

// 翻轉中的物件：沿一軸以 cos 壓扁，看起來像在空中翻面
function tumble(ctx: CanvasRenderingContext2D, p: Particle) {
  ctx.rotate(p.angle)
  ctx.scale(1, Math.max(0.2, Math.abs(Math.cos(p.phase))))
}

function flower(ctx: CanvasRenderingContext2D, p: Particle, petals: number, petalScale: number, center: string) {
  ctx.rotate(p.angle)
  const s = p.size
  for (let i = 0; i < petals; i++) {
    ctx.save()
    ctx.rotate((i * TAU) / petals)
    ctx.translate(0, -s * 0.45)
    ctx.beginPath()
    ctx.ellipse(0, 0, s * 0.32 * petalScale, s * 0.45, 0, 0, TAU)
    ctx.fill()
    ctx.restore()
  }
  ctx.fillStyle = center
  ctx.beginPath()
  ctx.arc(0, 0, s * 0.18, 0, TAU)
  ctx.fill()
}

function mapleLeaf(ctx: CanvasRenderingContext2D, p: Particle) {
  ctx.rotate(p.angle)
  ctx.scale(Math.cos(p.phase), 1)
  const s = p.size
  ctx.beginPath()
  for (let i = 0; i <= 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const r = i % 2 === 0 ? s : s * 0.55
    if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
    else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
  }
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = p.color
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, s * 0.3)
  ctx.lineTo(0, s * 1.2)
  ctx.stroke()
}

const glow = (ctx: CanvasRenderingContext2D, p: Particle, radius: number) => {
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, radius)
  g.addColorStop(0, p.color)
  g.addColorStop(0.25, p.color + '88')
  g.addColorStop(1, p.color + '00')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, TAU)
  ctx.fill()
}

const ELEMENTS: Record<ParticleKind, Element> = {
  plum: {
    colors: ['#f6d7de', '#f1b6c4', '#fbe9ec'],
    size: [6, 9],
    motion: 'fall',
    speed: [0.3, 0.7],
    draw: (ctx, p) => flower(ctx, p, 5, 1.1, '#e9c46a'),
  },
  peach: {
    colors: ['#f4a6b8', '#ef93a9', '#f8c3cf'],
    size: [4, 7],
    motion: 'fall',
    speed: [0.35, 0.8],
    draw: (ctx, p) => {
      tumble(ctx, p)
      petal(ctx, p.size)
    },
  },
  sakura: {
    colors: ['#fbe0e6', '#f7cdd7', '#fdeef1'],
    size: [4, 7],
    motion: 'fall',
    speed: [0.3, 0.7],
    draw: (ctx, p) => {
      tumble(ctx, p)
      petal(ctx, p.size, true)
    },
  },
  tung: {
    colors: ['#fbfaf5', '#f3f1ea'],
    size: [7, 10],
    motion: 'fall',
    speed: [0.5, 1],
    draw: (ctx, p) => {
      tumble(ctx, p)
      flower(ctx, p, 5, 1, '#d4574e')
    },
  },
  phoenix: {
    colors: ['#e8553a', '#f07a3a', '#d9432f'],
    size: [4, 7],
    motion: 'fall',
    speed: [0.4, 0.9],
    draw: (ctx, p) => {
      tumble(ctx, p)
      petal(ctx, p.size)
    },
  },
  firefly: {
    colors: ['#e9f7a1', '#d4f08a', '#f4fbc0'],
    size: [1.2, 2.4],
    motion: 'wander',
    speed: [0.05, 0.15],
    draw: (ctx, p) => {
      ctx.globalAlpha *= 0.35 + 0.65 * Math.max(0, Math.sin(p.phase))
      glow(ctx, p, p.size * 6)
    },
  },
  lotus: {
    colors: ['#f2a7bd', '#f6c1d0', '#eb8fab'],
    size: [8, 12],
    motion: 'fall',
    speed: [0.3, 0.6],
    draw: (ctx, p) => {
      tumble(ctx, p)
      petal(ctx, p.size)
    },
  },
  osmanthus: {
    colors: ['#f0a830', '#f5bd4f', '#e89a20'],
    size: [2.5, 4],
    motion: 'fall',
    speed: [0.3, 0.6],
    draw: (ctx, p) => flower(ctx, p, 4, 1.2, '#c97f12'),
  },
  luan: {
    colors: ['#e7a1a0', '#d98b7f', '#eab38f'],
    size: [6, 9],
    motion: 'fall',
    speed: [0.4, 0.8],
    draw: (ctx, p) => {
      // 臺灣欒樹的蒴果：像小燈籠的三瓣紙質果莢
      tumble(ctx, p)
      const s = p.size
      ctx.beginPath()
      ctx.moveTo(0, -s)
      ctx.quadraticCurveTo(s * 0.9, -s * 0.2, 0, s)
      ctx.quadraticCurveTo(-s * 0.9, -s * 0.2, 0, -s)
      ctx.fill()
      ctx.strokeStyle = 'rgba(120,60,40,0.35)'
      ctx.lineWidth = 0.8
      ctx.beginPath()
      ctx.moveTo(0, -s)
      ctx.lineTo(0, s)
      ctx.stroke()
    },
  },
  'maple-yellow': {
    colors: ['#e0a23a', '#d98f2b', '#e8b44e'],
    size: [9, 14],
    motion: 'fall',
    speed: [0.5, 1.1],
    draw: mapleLeaf,
  },
  'maple-red': {
    colors: ['#c8553d', '#b8432f', '#d6643f'],
    size: [9, 14],
    motion: 'fall',
    speed: [0.5, 1.1],
    draw: mapleLeaf,
  },
  ginkgo: {
    colors: ['#e9c04a', '#f0cf63', '#dcae35'],
    size: [8, 12],
    motion: 'fall',
    speed: [0.5, 1],
    draw: (ctx, p) => {
      // 扇形葉，中間一道淺缺口
      ctx.rotate(p.angle)
      ctx.scale(Math.cos(p.phase), 1)
      const s = p.size
      ctx.beginPath()
      ctx.moveTo(0, s * 0.6)
      ctx.arc(0, s * 0.6, s, -Math.PI * 0.82, -Math.PI * 0.53)
      ctx.lineTo(0, -s * 0.2)
      ctx.arc(0, s * 0.6, s, -Math.PI * 0.47, -Math.PI * 0.18)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = p.color
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, s * 0.6)
      ctx.lineTo(0, s * 1.3)
      ctx.stroke()
    },
  },
  snow: {
    colors: ['#ffffff', '#eef4ff', '#dfe9f7'],
    size: [1, 3.2],
    motion: 'fall',
    speed: [0.35, 0.9],
    draw: (ctx, p) => {
      ctx.globalAlpha *= 0.5 + p.size * 0.12
      ctx.beginPath()
      ctx.arc(0, 0, p.size, 0, TAU)
      ctx.fill()
    },
  },
  rain: {
    colors: ['#b9c9dc', '#a7b9cf'],
    size: [10, 18],
    motion: 'rain',
    speed: [5, 8],
    draw: (ctx, p) => {
      ctx.strokeStyle = p.color
      ctx.globalAlpha *= 0.35
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(p.vx * 2, p.size)
      ctx.stroke()
    },
  },
}

const rand = (min: number, max: number) => min + Math.random() * (max - min)
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]

function pickKind(mix: ParticleMix): ParticleKind {
  const total = mix.reduce((sum, [, w]) => sum + w, 0)
  let r = Math.random() * total
  for (const [kind, w] of mix) {
    r -= w
    if (r <= 0) return kind
  }
  return mix[0][0]
}

function spawn(mix: ParticleMix, w: number, h: number, initial: boolean): Particle {
  const kind = pickKind(mix)
  const el = ELEMENTS[kind]
  const speed = rand(...el.speed)
  const base = {
    kind,
    x: rand(0, w),
    size: rand(...el.size),
    angle: rand(0, TAU),
    phase: rand(0, TAU),
    spin: rand(-0.025, 0.025),
    color: pick(el.colors),
  }
  switch (el.motion) {
    case 'wander':
      return { ...base, y: rand(h * 0.3, h), vx: rand(-speed, speed), vy: rand(-speed, speed * 0.6), spin: rand(0.01, 0.03) }
    case 'rain':
      return { ...base, y: initial ? rand(-h, h) : rand(-h * 0.3, -20), vx: rand(-1.2, -0.6), vy: speed }
    default:
      return { ...base, y: initial ? rand(0, h) : rand(-40, -10), vx: rand(-0.3, 0.3), vy: speed }
  }
}

function termMix(): ParticleMix {
  const term = Number(document.documentElement.dataset.term)
  return (TERM_THEMES[term] ?? TERM_THEMES[18]).mix
}

export function SeasonParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    let current: ParticleMix = termMix()
    let particles: Particle[] = []
    let w = 0
    let h = 0
    let frame = 0

    const count = () => {
      // 依面積換算，雨與雪需要多一點才有感覺
      const heavy = current.some(([k]) => k === 'rain' || k === 'snow') ? 2 : 1
      return Math.min(80, Math.round(((w * h) / (1440 * 900)) * 22 * heavy + 4))
    }
    const reseed = () => {
      particles = Array.from({ length: count() }, () => spawn(current, w, h, true))
    }
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = (canvas.parentElement ?? canvas).getBoundingClientRect()
      w = rect.width
      h = rect.height
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      reseed()
    }

    const tick = () => {
      ctx.clearRect(0, 0, w, h)
      for (let i = 0; i < particles.length; i++) {
        let p = particles[i]
        const el = ELEMENTS[p.kind]
        p.phase += Math.abs(p.spin) * 2
        p.angle += p.spin
        if (el.motion === 'wander') {
          p.x += p.vx + Math.sin(p.phase) * 0.2
          p.y += p.vy + Math.cos(p.phase * 0.7) * 0.15
          if (p.x < -20 || p.x > w + 20 || p.y < h * 0.2 || p.y > h + 20) p = particles[i] = spawn(current, w, h, true)
        } else {
          p.x += p.vx + (el.motion === 'rain' ? 0 : Math.sin(p.phase) * 0.5)
          p.y += p.vy
          if (p.y > h + 30 || p.x < -40 || p.x > w + 40) p = particles[i] = spawn(current, w, h, false)
        }
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.globalAlpha = 0.8
        ctx.fillStyle = p.color
        ELEMENTS[p.kind].draw(ctx, p)
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

    // 跟著 <html data-term> 走
    const observer = new MutationObserver(() => {
      current = termMix()
      reseed()
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-term'] })
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas.parentElement ?? canvas)
    document.addEventListener('visibilitychange', start)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      resizeObserver.disconnect()
      document.removeEventListener('visibilitychange', start)
    }
  }, [])

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />
}
