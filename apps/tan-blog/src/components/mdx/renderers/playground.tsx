'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { BanIcon, CodeXmlIcon, PlayIcon, RotateCcwIcon, SquareIcon, TerminalIcon } from 'lucide-react'
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

  const stop = () => {
    setRunId(undefined)
    setMessages([])
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
  const lines = activeFile?.code.replace(/\n$/, '').split('\n') ?? []

  return (
    <div
      ref={rootRef}
      className="mdx-block mdx-frame mdx-playground not-prose"
      style={{ '--pg-height': `${height}px` } as React.CSSProperties}
    >
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
                onClick={stop}
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

      {/* 寬的時候左程式碼、右預覽；窄的時候（看元件自己的寬度，不是螢幕寬度）上下排 */}
      <div className="mdx-pg-panes">
        {visible.length > 0 && (
          <div className="mdx-pg-code">
            <div role="tablist" className="mdx-pg-tabs">
              {visible.map((file) => (
                <button
                  key={file.name}
                  type="button"
                  role="tab"
                  aria-selected={file === activeFile}
                  data-active={file === activeFile || undefined}
                  onClick={() => setActive(file.name)}
                  className="mdx-pg-tab"
                >
                  {file.name}
                </button>
              ))}
            </div>
            <pre className="mdx-pg-source" tabIndex={0}>
              <code>
                {lines.map((line, i) => (
                  <span key={i} className="mdx-pg-line">
                    {line}
                    {'\n'}
                  </span>
                ))}
              </code>
            </pre>
          </div>
        )}

        <div className="mdx-pg-preview">
          <div className="mdx-pg-pane-label">
            <span className="mdx-pg-dot" data-live={runId ? '' : undefined} />
            {m.playground_preview_label()}
          </div>
          <div className="mdx-pg-stage">
            {srcDoc ? (
              <iframe
                ref={iframeRef}
                key={srcDoc}
                title={title ?? m.playground_preview()}
                sandbox="allow-scripts"
                srcDoc={srcDoc}
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
        </div>
      </div>

      {/* 終端機在最下面、橫跨整個寬度；沒執行時只留一列標題提示 */}
      <div className="mdx-pg-console">
        <div className="mdx-pg-console-head">
          <TerminalIcon aria-hidden />
          <span>Console</span>
          {messages.length > 0 && <span className="mdx-pg-count">{messages.length}</span>}
          {messages.length > 0 && (
            <button type="button" className="mdx-tool ml-auto" onClick={() => setMessages([])}>
              <BanIcon aria-hidden />
              {m.playground_clear()}
            </button>
          )}
        </div>
        {messages.length > 0 ? (
          <div className="mdx-pg-console-body" role="log" aria-live="polite">
            {messages.map((msg, i) => (
              <pre key={i} className="mdx-console-line" data-tone={LEVEL_TONE[msg.level]}>
                {msg.text}
              </pre>
            ))}
          </div>
        ) : (
          <p className="mdx-pg-console-empty">{m.playground_console_empty()}</p>
        )}
      </div>
    </div>
  )
}
