'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { PlayIcon, RotateCcwIcon, SquareIcon, TerminalIcon } from 'lucide-react'
import type { PlaygroundLang, PlaygroundTemplate } from '@sao-blog/mdx/registry'
import { Button } from '@sao-blog/ui/components/button'
import { useTheme } from '@/components/theme-provider'
import { cn } from '@/lib/utils'
import {
  buildPlaygroundDocument,
  type PlaygroundFileData,
  type PlaygroundMessage,
} from './playground-runtime'

export interface MdxPlaygroundFileProps {
  name: string
  lang: PlaygroundLang
  hidden?: boolean
  /** 原始碼（編譯時存成單一文字節點） */
  children?: React.ReactNode
}

/**
 * 只是資料容器：由 <Playground> 讀取 props，自己不渲染。
 * 萬一單獨出現（理論上編譯器不會產生）就顯示原始碼。
 */
export const MdxPlaygroundFile = ({ name, children }: MdxPlaygroundFileProps) => (
  <pre className="my-4 overflow-x-auto rounded-lg border p-4 text-sm" title={name}>
    <code>{children}</code>
  </pre>
)

export interface MdxPlaygroundProps {
  template: PlaygroundTemplate
  title?: string
  height?: number
  autoRun?: boolean
  children?: React.ReactNode
}

const toText = (node: React.ReactNode): string =>
  typeof node === 'string' || typeof node === 'number'
    ? String(node)
    : Array.isArray(node)
      ? node.map(toText).join('')
      : ''

function collectFiles(children: React.ReactNode): PlaygroundFileData[] {
  return React.Children.toArray(children).flatMap((child) => {
    if (!React.isValidElement<MdxPlaygroundFileProps>(child)) return []
    const { name, lang, hidden, children: code } = child.props
    if (typeof name !== 'string' || typeof lang !== 'string') return []
    return [{ name, lang, hidden, code: toText(code) }]
  })
}

const LEVEL_CLASS: Record<PlaygroundMessage['level'], string> = {
  log: 'text-foreground',
  info: 'text-sky-600 dark:text-sky-400',
  warn: 'text-amber-600 dark:text-amber-400',
  error: 'text-red-600 dark:text-red-400',
}

/**
 * 可執行的程式碼示範。程式碼是文章的「資料」，只在 sandbox iframe 內執行：
 * `sandbox="allow-scripts"`（沒有 allow-same-origin）→ opaque origin，
 * 碰不到部落格的 DOM / cookie / storage。SSR 時只輸出程式碼分頁，
 * iframe 在使用者按「執行」（或 autoRun 進入畫面）後才於 client 建立。
 */
export function MdxPlayground({
  template,
  title,
  height = 320,
  autoRun = false,
  children,
}: MdxPlaygroundProps) {
  const files = useMemo(() => collectFiles(children), [children])
  const visible = files.filter((f) => !f.hidden)
  const [active, setActive] = useState(visible[0]?.name)
  const [runId, setRunId] = useState<string>()
  const [messages, setMessages] = useState<PlaygroundMessage[]>([])
  const { theme } = useTheme()
  const rootRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const run = () => {
    setMessages([])
    setRunId(Math.random().toString(36).slice(2))
  }

  useEffect(() => {
    if (!autoRun || !rootRef.current) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        run()
        observer.disconnect()
      }
    })
    observer.observe(rootRef.current)
    return () => observer.disconnect()
  }, [autoRun])

  useEffect(() => {
    if (!runId) return
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { __playground?: string } & Partial<PlaygroundMessage>
      if (event.source !== iframeRef.current?.contentWindow) return
      if (data?.__playground !== runId || typeof data.text !== 'string') return
      const level = data.level && data.level in LEVEL_CLASS ? data.level : 'log'
      setMessages((prev) => [...prev.slice(-199), { level, text: data.text! }])
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [runId])

  // 切換主題時重新產生文件（iframe 會重新載入，跟著部落格的深淺色）
  const srcDoc = useMemo(
    () => (runId ? buildPlaygroundDocument({ template, files, theme, runId }) : undefined),
    [runId, template, files, theme]
  )

  const activeFile = visible.find((f) => f.name === active) ?? visible[0]

  return (
    <div
      ref={rootRef}
      className="not-prose my-6 overflow-hidden rounded-lg border border-border"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/50 px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          {title && <span className="truncate font-medium">{title}</span>}
          <span className="rounded bg-background px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
            {template}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {runId ? (
            <>
              <Button type="button" variant="ghost" size="xs" onClick={run}>
                <RotateCcwIcon className="size-3.5" />
                重新執行
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => setRunId(undefined)}
                aria-label="停止"
              >
                <SquareIcon className="size-3.5" />
              </Button>
            </>
          ) : (
            <Button type="button" variant="ghost" size="xs" onClick={run}>
              <PlayIcon className="size-3.5" />
              執行
            </Button>
          )}
        </div>
      </div>

      {visible.length > 0 && (
        <>
          <div role="tablist" className="flex overflow-x-auto border-b border-border bg-muted/30">
            {visible.map((file) => (
              <button
                key={file.name}
                type="button"
                role="tab"
                aria-selected={file === activeFile}
                onClick={() => setActive(file.name)}
                className={cn(
                  '-mb-px border-b-2 px-3 py-1.5 font-mono text-xs transition-colors',
                  file === activeFile
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {file.name}
              </button>
            ))}
          </div>
          <pre className="max-h-96 overflow-auto bg-background p-4 text-sm leading-relaxed">
            <code className="font-mono">{activeFile?.code}</code>
          </pre>
        </>
      )}

      <div className="border-t border-border" style={{ height }}>
        {srcDoc ? (
          <iframe
            ref={iframeRef}
            key={srcDoc}
            title={title ?? 'Playground 預覽'}
            sandbox="allow-scripts"
            srcDoc={srcDoc}
            className="size-full border-0 bg-background"
          />
        ) : (
          <button
            type="button"
            onClick={run}
            className="flex size-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
          >
            <PlayIcon className="size-6" />
            點擊執行（於隔離的沙盒中）
          </button>
        )}
      </div>

      {runId && messages.length > 0 && (
        <div className="max-h-40 overflow-auto border-t border-border bg-muted/30 px-3 py-2 font-mono text-xs">
          <div className="mb-1 flex items-center gap-1 text-muted-foreground">
            <TerminalIcon className="size-3.5" />
            Console
          </div>
          {messages.map((msg, i) => (
            <pre key={i} className={cn('whitespace-pre-wrap break-all', LEVEL_CLASS[msg.level])}>
              {msg.text}
            </pre>
          ))}
        </div>
      )}
    </div>
  )
}
