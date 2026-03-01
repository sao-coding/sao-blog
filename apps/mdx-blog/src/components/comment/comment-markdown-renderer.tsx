/**
 * Markdown 渲染元件
 *
 * 使用 markdown-to-jsx 搭配 Shiki 實現語法高亮。
 * 支援完整 GFM（表格、任務清單、刪除線、自動連結、標籤過濾等）。
 *
 * @module components/comment/comment-markdown-renderer
 */

'use client'

import { useEffect, useState, useMemo, type ComponentProps } from 'react'
import Markdown from 'markdown-to-jsx'
import { codeToHtml } from 'shiki'
import {
  transformerNotationDiff,
  transformerNotationHighlight,
} from '@shikijs/transformers'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

/**
 * 將 React children 轉為純文字字串
 * @param children - React 節點
 * @returns 純文字字串
 */
function childrenToText(children: React.ReactNode): string {
  if (typeof children === 'string') return children
  if (typeof children === 'number') return String(children)
  if (Array.isArray(children)) return children.map(childrenToText).join('')
  if (children && typeof children === 'object' && 'props' in children) {
    return childrenToText(
      (children as React.ReactElement<{ children?: React.ReactNode }>).props
        ?.children
    )
  }
  return ''
}

/**
 * 程式碼區塊元件（支援 Shiki 語法高亮）
 *
 * 當 className 包含 lang-* 時視為 fenced code block，使用 Shiki 進行語法高亮。
 * 否則視為行內程式碼，使用基本樣式渲染。
 */
function CodeBlock({
  className,
  children,
}: {
  className?: string
  children?: React.ReactNode
}) {
  const language = className?.replace('lang-', '') || ''
  const code = childrenToText(children).replace(/\n$/, '')
  const [highlightedHtml, setHighlightedHtml] = useState<string>('')
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    if (!language || !code) return

    let cancelled = false
    const theme = resolvedTheme === 'dark' ? 'github-dark' : 'github-light'

    codeToHtml(code, {
      lang: language,
      theme,
      transformers: [
        transformerNotationDiff(),
        transformerNotationHighlight(),
      ],
    })
      .then((html) => {
        if (!cancelled) setHighlightedHtml(html)
      })
      .catch(() => {
        // 語言不支援時保持原始碼顯示
      })

    return () => {
      cancelled = true
    }
  }, [code, language, resolvedTheme])

  // 行內程式碼
  if (!language) {
    return (
      <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono text-foreground">
        {children}
      </code>
    )
  }

  // 已高亮的 fenced code block
  if (highlightedHtml) {
    return (
      <div
        className="my-2 overflow-x-auto rounded-lg text-sm [&>pre]:p-4 [&>pre]:rounded-lg"
        dangerouslySetInnerHTML={{ __html: highlightedHtml }}
      />
    )
  }

  // 等待高亮中的 fenced code block（fallback）
  return (
    <pre className="my-2 overflow-x-auto rounded-lg bg-muted p-4 text-sm font-mono">
      <code>{code}</code>
    </pre>
  )
}

/**
 * 預覽區塊 pre 元素覆寫
 *
 * 將 pre 改為 div，因為 CodeBlock 已處理所有 fenced code block 的渲染。
 */
function PreBlock({ children, ...props }: ComponentProps<'pre'>) {
  return (
    <div {...(props as ComponentProps<'div'>)} className="not-prose">
      {children}
    </div>
  )
}

/** markdown-to-jsx 覆寫設定 */
const markdownOverrides = {
  pre: { component: PreBlock },
  code: { component: CodeBlock },
  a: {
    component: ({
      children,
      ...props
    }: ComponentProps<'a'>) => (
      <a
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-4 hover:text-primary/80"
        {...props}
      >
        {children}
      </a>
    ),
  },
  table: {
    component: ({
      children,
      ...props
    }: ComponentProps<'table'>) => (
      <div className="my-2 overflow-x-auto">
        <table
          className="min-w-full border-collapse border border-border text-sm"
          {...props}
        >
          {children}
        </table>
      </div>
    ),
  },
  th: {
    component: ({
      children,
      ...props
    }: ComponentProps<'th'>) => (
      <th className="border border-border bg-muted px-3 py-1.5 text-left font-medium" {...props}>
        {children}
      </th>
    ),
  },
  td: {
    component: ({
      children,
      ...props
    }: ComponentProps<'td'>) => (
      <td className="border border-border px-3 py-1.5" {...props}>
        {children}
      </td>
    ),
  },
  input: {
    component: (props: ComponentProps<'input'>) => (
      <input
        {...props}
        disabled
        className="mr-1.5 size-3.5 accent-primary align-middle"
      />
    ),
  },
}

interface CommentMarkdownRendererProps {
  /** Markdown 內容字串 */
  content: string
  /** 額外的 className */
  className?: string
}

/**
 * 留言 Markdown 渲染器
 *
 * 使用 markdown-to-jsx 解析並渲染 Markdown。
 * 支援 GFM 表格、任務清單、刪除線、自動連結、程式碼高亮等。
 * Markdown 渲染如遇無法解析語法，則顯示原文。
 * 防止 XSS（markdown-to-jsx v9 預設開啟 tagfilter）。
 *
 * @param props - 渲染器屬性
 * @returns 渲染後的 Markdown 元素
 */
export function CommentMarkdownRenderer({
  content,
  className,
}: CommentMarkdownRendererProps) {
  const rendered = useMemo(() => {
    try {
      return (
        <Markdown
          options={{
            forceBlock: true,
            overrides: markdownOverrides,
          }}
        >
          {content}
        </Markdown>
      )
    } catch {
      // Markdown 解析失敗時顯示原文
      return <pre className="whitespace-pre-wrap text-sm">{content}</pre>
    }
  }, [content])

  return (
    <div
      className={cn(
        'prose prose-sm dark:prose-invert max-w-none break-words',
        '[&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-4',
        '[&_del]:line-through [&_blockquote]:border-l-2 [&_blockquote]:border-muted-foreground/30 [&_blockquote]:pl-4 [&_blockquote]:italic',
        className
      )}
    >
      {rendered}
    </div>
  )
}
