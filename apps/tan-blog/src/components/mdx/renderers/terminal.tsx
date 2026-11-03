'use client'

import React, { useEffect, useRef, useState } from 'react'
import { CheckIcon, CopyIcon } from 'lucide-react'
import { m } from '#/paraglide/messages'

export interface MdxTerminalProps {
  title?: string
  /** 捲到畫面時才逐行打出來 */
  animate?: boolean
  children?: React.ReactNode
}

type Line =
  | { kind: 'command'; prompt: string; text: string }
  | { kind: 'comment'; text: string }
  | { kind: 'output'; text: string }

// 指令行的提示字元：$ / ❯ / > / PowerShell 的 PS C:\path>
const PROMPT = /^(\$|❯|>|PS [^>]*>)\s/

const nodeToText = (node: React.ReactNode): string =>
  typeof node === 'string' || typeof node === 'number'
    ? String(node)
    : Array.isArray(node)
      ? node.map(nodeToText).join('')
      : React.isValidElement<{ children?: React.ReactNode }>(node)
        ? nodeToText(node.props.children)
        : ''

// 子內容是 code fence（經 Shiki 變成 <pre><code><span class="line">…）。
// 逐行取純文字；沒有 .line 就直接切換行
function collectLines(children: React.ReactNode): string[] {
  const out: string[] = []
  const walk = (node: React.ReactNode) => {
    React.Children.forEach(node, (child) => {
      if (!React.isValidElement<{ className?: string; children?: React.ReactNode }>(child)) return
      if (child.props.className?.split(' ').includes('line')) out.push(nodeToText(child))
      else walk(child.props.children)
    })
  }
  walk(children)
  if (out.length > 0) return out
  return nodeToText(children).replace(/\n$/, '').split('\n')
}

function parse(raw: string): Line {
  const prompt = raw.match(PROMPT)
  if (prompt) return { kind: 'command', prompt: prompt[1], text: raw.slice(prompt[0].length) }
  if (/^#\s/.test(raw)) return { kind: 'comment', text: raw }
  return { kind: 'output', text: raw }
}

// 打字速度：指令一次 1–2 個字、每 32ms；指令打完停一下再出輸出，輸出整行出現
const TYPE_MS = 32
const AFTER_COMMAND_MS = 380
const OUTPUT_MS = 70

/**
 * 終端機視窗（概念取自 Magic UI 的 Terminal，但預設是靜態的）：
 * - 墨色面板，晝夜都是深底；指令前的提示字元用玉色、輸出淡一點、註解更淡
 * - 複製只複製指令（不含提示字元與輸出），貼上就能跑
 * - animate：捲到才逐行打字；還沒打到的行先佔位（visibility: hidden），版面不會跳；
 *   點一下直接跳到結尾；偏好減少動態、或一開始就在畫面內時不播
 *
 * ```mdx
 * <Terminal title="zsh" animate>
 * ```bash
 * $ pnpm create vite
 * ✔ Project name: … my-app
 * ```
 * </Terminal>
 * ```
 */
export function MdxTerminal({ title, animate = false, children }: MdxTerminalProps) {
  const lines = collectLines(children).map(parse)
  const rootRef = useRef<HTMLDivElement>(null)
  // null＝全部顯示；否則顯示到第 line 行的第 chars 個字
  const [progress, setProgress] = useState<{ line: number; chars: number } | null>(null)
  const [started, setStarted] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const el = rootRef.current
    if (!animate || !el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (el.getBoundingClientRect().top < window.innerHeight * 0.85) return
    setProgress({ line: 0, chars: 0 })
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        setStarted(true)
        observer.disconnect()
      },
      { rootMargin: '0px 0px -20% 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [animate])

  useEffect(() => {
    if (!started || !progress) return
    const current = lines[progress.line]
    if (!current) {
      setProgress(null)
      return
    }
    if (current.kind === 'command' && progress.chars < current.text.length) {
      const timer = setTimeout(
        () => setProgress({ line: progress.line, chars: progress.chars + 1 + (Math.random() < 0.3 ? 1 : 0) }),
        TYPE_MS
      )
      return () => clearTimeout(timer)
    }
    const timer = setTimeout(
      () => setProgress({ line: progress.line + 1, chars: 0 }),
      current.kind === 'command' ? AFTER_COMMAND_MS : OUTPUT_MS
    )
    return () => clearTimeout(timer)
  }, [started, progress, lines])

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  const copy = async () => {
    const commands = lines.flatMap((l) => (l.kind === 'command' ? [l.text] : []))
    try {
      await navigator.clipboard.writeText(commands.join('\n'))
      setCopied(true)
    } catch {
      // 沒有剪貼簿權限（例如在 iframe 裡）就算了，不打斷閱讀
    }
  }

  const playing = progress !== null

  return (
    <div
      ref={rootRef}
      className="mdx-block mdx-term not-prose"
      data-playing={playing || undefined}
      onClick={playing ? () => setProgress(null) : undefined}
    >
      <div className="mdx-term-bar">
        <span className="mdx-term-dots" aria-hidden>
          <span />
          <span />
          <span />
        </span>
        <span className="mdx-term-title">{title ?? 'Terminal'}</span>
        <button
          type="button"
          className="mdx-term-copy"
          onClick={(e) => {
            e.stopPropagation()
            void copy()
          }}
          aria-label={copied ? m.code_copied() : m.terminal_copy()}
          title={m.terminal_copy()}
        >
          {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
        </button>
      </div>
      <pre className="mdx-term-body" tabIndex={0}>
        {lines.map((line, i) => {
          const hidden = playing && i > progress.line
          const typing = playing && i === progress.line
          const text =
            typing && line.kind === 'command' ? line.text.slice(0, progress.chars) : line.text
          return (
            <span key={i} className="mdx-term-line" data-kind={line.kind} data-hidden={hidden || undefined}>
              {line.kind === 'command' && <span className="mdx-term-prompt">{line.prompt} </span>}
              {typing && line.kind !== 'command' ? '' : text}
              {typing && line.kind === 'command' && <span className="mdx-term-cursor" />}
              {'\n'}
            </span>
          )
        })}
        {animate && !playing && (
          <span className="mdx-term-line" data-kind="command">
            <span className="mdx-term-prompt">$ </span>
            <span className="mdx-term-cursor" data-blink />
          </span>
        )}
      </pre>
    </div>
  )
}
