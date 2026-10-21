'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { CodeXmlIcon, PlayIcon, RotateCcwIcon, SquareIcon, TerminalIcon } from 'lucide-react'
import type { PlaygroundLang, PlaygroundTemplate } from '@sao-blog/mdx/registry'
import { m } from '#/paraglide/messages'
import { useTheme } from '@/components/theme-provider'
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
  <pre className="mdx-block mdx-frame mdx-code-plain" title={name}>
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

// 對應 blocks.css 的 [data-tone]；log 用一般墨色
const LEVEL_TONE: Record<PlaygroundMessage['level'], string | undefined> = {
  log: undefined,
  info: 'blue',
  warn: 'amber',
  error: 'red',
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
      const level = data.level && data.level in LEVEL_TONE ? data.level : 'log'
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
    <div ref={rootRef} className="mdx-block mdx-frame mdx-playground not-prose">
      <div className="mdx-block-head">
        <span className="mdx-block-label">
          <CodeXmlIcon aria-hidden />
          {title && <span className="mdx-block-label-text font-medium text-foreground">{title}</span>}
          <span className="mdx-chip">{template}</span>
        </span>
        <span className="flex flex-none items-center gap-0.5">
          {runId ? (
            <>
              <button type="button" className="mdx-tool" data-accent onClick={run}>
                <RotateCcwIcon aria-hidden />
                {m.playground_rerun()}
              </button>
              <button
                type="button"
                className="mdx-tool"
                onClick={() => setRunId(undefined)}
                aria-label={m.playground_stop()}
                title={m.playground_stop()}
              >
                <SquareIcon aria-hidden />
              </button>
            </>
          ) : (
            <button type="button" className="mdx-tool" data-accent onClick={run}>
              <PlayIcon aria-hidden />
              {m.playground_run()}
            </button>
          )}
        </span>
      </div>

      {visible.length > 0 && (
        <>
          <div className="mdx-block-head mdx-tabs-head">
            <div role="tablist" className="mdx-tabs-list">
              {visible.map((file) => (
                <button
                  key={file.name}
                  type="button"
                  role="tab"
                  aria-selected={file === activeFile}
                  data-active={file === activeFile || undefined}
                  onClick={() => setActive(file.name)}
                  className="mdx-tab mdx-tab-underline mdx-mono"
                >
                  {file.name}
                </button>
              ))}
            </div>
          </div>
          <pre className="mdx-code-plain max-h-96 overflow-auto">
            <code>{activeFile?.code}</code>
          </pre>
        </>
      )}

      <div className="mdx-playground-stage" style={{ height }}>
        {srcDoc ? (
          <iframe
            ref={iframeRef}
            key={srcDoc}
            title={title ?? m.playground_preview()}
            sandbox="allow-scripts"
            srcDoc={srcDoc}
            className="size-full border-0 bg-background"
          />
        ) : (
          <button type="button" onClick={run} className="mdx-playground-idle">
            <span className="mdx-playground-idle-icon">
              <PlayIcon className="size-5 translate-x-px" aria-hidden />
            </span>
            {m.playground_idle()}
          </button>
        )}
      </div>

      {runId && messages.length > 0 && (
        <div className="mdx-playground-console">
          <div className="mdx-playground-console-head">
            <TerminalIcon aria-hidden />
            Console
          </div>
          {messages.map((msg, i) => (
            <pre key={i} className="mdx-console-line" data-tone={LEVEL_TONE[msg.level]}>
              {msg.text}
            </pre>
          ))}
        </div>
      )}
    </div>
  )
}
