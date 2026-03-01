import React from 'react'
import type { MDXComponents } from 'next-mdx-remote-client/rsc'
import { Echarts, Mermaid, Count, CustomQuote } from './renderers'
import {
  Glimpse,
  GlimpseContent,
  GlimpseDescription,
  GlimpseImage,
  GlimpseTitle,
  GlimpseTrigger,
} from '../kibo-ui/glimpse'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import EnhancedLink from './renderers/link'

// 匯出個別 renderers
export { Mermaid, Echarts, Count }

// 預設 MDX components 配置
export const defaultMDXComponents: MDXComponents = {
  wrapper: function Wrapper({
    children,
  }: React.ComponentPropsWithoutRef<'div'>) {
    return <div className="mdx-wrapper text-lg">{children}</div>
  },
  /* 為所有標題加上 scroll-margin-top（對應 sticky top-20） */
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className="scroll-mt-20" {...props} />
  ),
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="scroll-mt-20" {...props} />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="scroll-mt-20" {...props} />
  ),
  h4: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h4 className="scroll-mt-20" {...props} />
  ),
  h5: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h5 className="scroll-mt-20" {...props} />
  ),
  h6: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h6 className="scroll-mt-20" {...props} />
  ),
  a: async (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    const href = props.href ?? ''

    // 預設 preview 資料
    let data: {
      title: string | null
      description: string | null
      image: string | null
    } = {
      title: null,
      description: null,
      image: null,
    }

    // 僅對外部 HTTP/HTTPS 連結嘗試抓取 preview（server helper）
    if (href && /^https?:\/\//.test(href)) {
      try {
        // 動態載入 server helper 並抓取預覽資料（只在 server side 執行）
        const { glimpse } = await import('../kibo-ui/glimpse/server')
        data = await glimpse(href)
      } catch (e) {
        console.error('Failed to fetch link preview for', href, e)
      }
    }

    return <EnhancedLink href={href} data={data} {...props} />
  },
  code: ({
    className,
    children,
  }: {
    className?: string
    children: React.ReactNode
  }) => {
    const text = String(children ?? '').trim()
    if (className === 'language-mermaid') {
      return <Mermaid>{text}</Mermaid>
    }
    if (className === 'language-echarts') {
      return <Echarts>{text}</Echarts>
    }
    return <code className={className}>{children}</code>
  },
  Count,
  CustomQuote,
}

// 擴充的 MDX components 型別，允許 null/false 來禁用 components
export type MDXComponentOverrides = {
  [K in keyof MDXComponents]?: MDXComponents[K] | null | false
}

// 深度合併 MDX components 的工具函式
export function mergeMDXComponents(
  baseComponents: MDXComponents = {},
  overrides: MDXComponentOverrides = {}
): MDXComponents {
  const merged = { ...baseComponents }

  for (const [key, value] of Object.entries(overrides)) {
    if (value === null || value === false) {
      // 如果 override 為 null 或 false，則移除該 component
      delete merged[key as keyof MDXComponents]
    } else if (value !== undefined) {
      // 否則設定或覆寫該 component
      merged[key as keyof MDXComponents] = value as NonNullable<typeof value>
    }
  }

  return merged
}

// 便利的工廠函式：建立自訂 MDX components
export function createMDXComponents(
  overrides: MDXComponentOverrides = {}
): MDXComponents {
  return mergeMDXComponents(defaultMDXComponents, overrides)
}

// 預設匯出（向後相容）
export const components = defaultMDXComponents
