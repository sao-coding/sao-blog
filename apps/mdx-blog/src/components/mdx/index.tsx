import React from 'react'
import type { MDXComponents } from 'next-mdx-remote-client/rsc'
import { Echarts, Mermaid, Count, CustomQuote, MdxImage } from './renderers'
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
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    const href = props.href ?? ''
    if (/^https?:\/\//.test(href)) {
      return <EnhancedLink href={href} {...props} />
    }
    return <a {...props} />
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
  img: MdxImage,
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
