'use client'
import React, { useEffect, useRef } from 'react'
import mermaid from 'mermaid'

export const Mermaid = ({ children }: { children: string }) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) {
      mermaid.initialize({ startOnLoad: false })
      ;(async () => {
        const uniqueId = 'mermaid-svg-' + Math.random().toString(36).slice(2)
        const { svg } = await mermaid.render(uniqueId, children)
        ref.current!.innerHTML = svg
      })()
    }
  }, [children])

  return <div ref={ref} className="mermaid" />
}
