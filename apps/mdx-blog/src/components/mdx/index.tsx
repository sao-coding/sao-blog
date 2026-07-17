import React from 'react'
import type { MDXComponents } from 'next-mdx-remote-client/rsc'
import {
  Echarts,
  Mermaid,
  Count,
  CustomQuote,
  MdxImage,
  MdxAlert,
  MdxAccordion,
  MdxAccordionItem,
  MdxTabs,
  MdxTab,
  MdxCarousel,
  MdxSlide,
  MdxProgress,
  CodeBlockHeader,
} from './renderers'
import EnhancedLink from './renderers/link'
import { cn } from '@/lib/utils'

// 匯出個別 renderers
export { Mermaid, Echarts, Count }

// 把 React 節點樹（例如 Shiki 輸出的 <code><span>...</span></code>）攤平成純文字，
// 用來算行數、複製到剪貼簿。
function nodeToText(node: React.ReactNode): string {
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(nodeToText).join('')
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return nodeToText(node.props.children)
  }
  return ''
}

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
  // Shiki（rehype 階段）已將一般語言的 fenced code block 轉為帶語法高亮的 <pre class="shiki ...">，
  // 這裡補上排版樣式，並用 not-prose 避開 typography 外掛的預設 pre 樣式。
  pre: ({
    className,
    children,
    ...props
  }: React.HTMLAttributes<HTMLElement>) => {
    // mermaid/echarts 的 code 元件回傳的是 <div>（Mermaid/Echarts），
    // <pre> 的內容模型只允許 phrasing content，塞入 <div> 屬於不合法的 HTML
    // 巢狀，會在 hydration 時炸掉，因此改用 <div> 包裹。
    const childClassName = React.isValidElement<{ className?: string }>(children)
      ? children.props.className
      : undefined
    if (
      childClassName === 'language-mermaid' ||
      childClassName === 'language-echarts'
    ) {
      return (
        <div className={cn('not-prose my-4', className)} {...props}>
          {children}
        </div>
      )
    }

    const isShiki = className?.split(' ').includes('shiki')
    if (!isShiki) {
      return (
        <pre className={className} {...props}>
          {children}
        </pre>
      )
    }

    const lang = childClassName?.startsWith('language-')
      ? childClassName.slice('language-'.length)
      : undefined
    const codeText = nodeToText(children)

    return (
      <CodeBlockHeader lang={lang} codeText={codeText}>
        <pre
          className={cn(
            'overflow-x-auto py-4 text-sm leading-relaxed',
            className
          )}
          {...props}
        >
          {children}
        </pre>
      </CodeBlockHeader>
    )
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
    // 沒有語言標記的行內程式碼（例如 `foo`）
    if (!className) {
      return (
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em] text-foreground">
          {children}
        </code>
      )
    }
    return <code className={className}>{children}</code>
  },
  Count,
  CustomQuote,
  img: MdxImage,
  // 文章用區塊元件（作者在 MDX 中直接以 JSX 標籤書寫）
  Alert: MdxAlert,
  Accordion: MdxAccordion,
  AccordionItem: MdxAccordionItem,
  Tabs: MdxTabs,
  Tab: MdxTab,
  Carousel: MdxCarousel,
  Slide: MdxSlide,
  Progress: MdxProgress,
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
