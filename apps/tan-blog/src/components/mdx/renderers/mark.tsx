'use client'

import React, { useEffect, useRef } from 'react'
import type { ProgressColor } from './progress'

export interface MdxMarkProps {
  /** 標記方式，預設 highlight（螢光筆） */
  type?: 'highlight' | 'underline' | 'strike' | 'circle' | 'box'
  /** 換色；highlight 預設赭黃（螢光筆），其餘預設朱（批改的朱筆） */
  color?: ProgressColor
  children?: React.ReactNode
}

/**
 * 手繪標記（行內），概念取自 Magic UI 的 Highlighter，但整個用 CSS 畫：
 * - SSR 就有標記（RSS、列印、沒跑 JS 也看得到），跨行時每一行各自畫（box-decoration-break）
 * - 語意標籤：highlight 是 <mark>、strike 是 <s>
 * - 捲到畫面時才「畫上去」；一開始就在畫面內的不播動畫，偏好減少動態時直接顯示
 * 樣式在 blocks.css 的 .mdx-mark。
 *
 * ```mdx
 * 這裡是<Mark>最重要的一句</Mark>，<Mark type="strike">不要這樣做</Mark>，
 * 而是<Mark type="circle">這樣</Mark>。
 * ```
 */
export const MdxMark = ({ type = 'highlight', color, children }: MdxMarkProps) => {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    // 還在畫面下方的才先收起來，等捲到再畫；已經看得到的維持原樣，不會閃一下
    if (el.getBoundingClientRect().top < window.innerHeight) return
    el.dataset.pending = ''
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        delete el.dataset.pending
        observer.disconnect()
      },
      { rootMargin: '0px 0px -15% 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const Tag = type === 'highlight' ? 'mark' : type === 'strike' ? 's' : 'span'
  return (
    <Tag
      ref={ref as React.Ref<never>}
      className="mdx-mark"
      data-type={type}
      data-tone={color ?? (type === 'highlight' ? 'amber' : '')}
    >
      {children}
    </Tag>
  )
}
