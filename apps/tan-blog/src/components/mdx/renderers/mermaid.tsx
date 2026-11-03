'use client'
import { useEffect, useRef } from 'react'
import { useTheme } from '@/components/theme-provider'
import { Zoomable } from './zoomable'

// 圖表在編譯階段（@sao-blog/mdx 的 rehypeMermaid）已用 beautiful-mermaid 轉成 SVG，
// 這裡直接顯示：瀏覽器不必下載 beautiful-mermaid 與 ELK 排版引擎，SSR 也直接有圖。
// 沒有 svg 的是 beautiful-mermaid 不支援的圖（pie、gantt、mindmap…），才退回 client 端的 mermaid。
export const Mermaid = ({ children, svg }: { children: string; svg?: string }) => {
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
