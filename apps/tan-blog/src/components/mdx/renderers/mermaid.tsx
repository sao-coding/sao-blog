'use client'
import { useEffect, useMemo, useRef } from 'react'
import { renderMermaidSVG } from 'beautiful-mermaid'
import { useTheme } from '@/components/theme-provider'
import { Zoomable } from './zoomable'

// 圖表主要用 beautiful-mermaid 渲染（flowchart / state / sequence / class / ER / xychart）：
// - 同步、不碰 DOM，SSR 就能直接輸出 SVG
// - 顏色傳 CSS 變數，跟著宣紙／夜讀主題切換，不用重新渲染
// 它不支援的圖（pie、gantt、mindmap…）才退回 client 端的 mermaid。
// 它的 SVG 內部用 --muted / --border / --accent 等變數，沒給的話會繼承到站內同名的
// shadcn 變數（語意完全不同，例如 --muted 是底色，標籤字會消失），所以每個都明確給
const OPTIONS = {
  bg: 'var(--card)',
  fg: 'var(--foreground)',
  accent: 'var(--ink)',
  line: 'color-mix(in oklch, var(--foreground) 45%, transparent)',
  muted: 'var(--muted-foreground)',
  surface: 'color-mix(in oklch, var(--foreground) 4%, var(--card))',
  border: 'color-mix(in oklch, var(--foreground) 28%, transparent)',
  font: 'LXGW WenKai TC',
  transparent: true,
} as const

function renderBeautiful(code: string): string | null {
  try {
    // 字型已由站內 Fontsource 載入，拿掉它自帶的 Google Fonts @import
    return renderMermaidSVG(code, OPTIONS).replace(/@import url\([^)]*\);?/g, '')
  } catch {
    return null
  }
}

export const Mermaid = ({ children }: { children: string }) => {
  const svg = useMemo(() => renderBeautiful(children), [children])
  return (
    <Zoomable>
      {svg ? (
        <span className="mermaid mermaid-beautiful" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <MermaidFallback code={children} />
      )}
    </Zoomable>
  )
}

function MermaidFallback({ code }: { code: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const { theme } = useTheme()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { default: mermaid } = await import('mermaid')
      mermaid.initialize({ startOnLoad: false, theme: theme === 'dark' ? 'dark' : 'neutral' })
      const id = 'mermaid-svg-' + Math.random().toString(36).slice(2)
      const { svg } = await mermaid.render(id, code)
      if (!cancelled && ref.current) ref.current.innerHTML = svg
    })()
    return () => {
      cancelled = true
    }
  }, [code, theme])

  return <span ref={ref} className="mermaid block" />
}
