'use client'

import { useEffect, useRef, useState } from 'react'
import {
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  FileCode2,
  SquareTerminal,
  WrapText,
  XIcon,
} from 'lucide-react'
import {
  SiC,
  SiCplusplus,
  SiCss,
  SiDocker,
  SiDotnet,
  SiGnubash,
  SiGo,
  SiGraphql,
  SiHtml5,
  SiJavascript,
  SiJson,
  SiMarkdown,
  SiMdx,
  SiNginx,
  SiOpenjdk,
  SiPhp,
  SiPython,
  SiReact,
  SiRuby,
  SiRust,
  SiSass,
  SiSvelte,
  SiToml,
  SiTypescript,
  SiVuedotjs,
  SiXml,
  SiYaml,
} from '@icons-pack/react-simple-icons'
import { m } from '#/paraglide/messages'

// 超過這個行數就預設收合，避免長程式碼把文章版面撐爆
const COLLAPSE_LINE_THRESHOLD = 15
// 收合時保留的高度（約 15 行程式碼，最後幾行由 CSS 淡出）
const COLLAPSED_HEIGHT = 360

// 題簽顯示的語言名稱；沒列到的照原樣顯示
const LANG_LABELS: Record<string, string> = {
  ts: 'TypeScript',
  typescript: 'TypeScript',
  tsx: 'TSX',
  js: 'JavaScript',
  javascript: 'JavaScript',
  jsx: 'JSX',
  py: 'Python',
  python: 'Python',
  sh: 'Shell',
  shell: 'Shell',
  bash: 'Bash',
  zsh: 'Zsh',
  powershell: 'PowerShell',
  ps1: 'PowerShell',
  json: 'JSON',
  jsonc: 'JSONC',
  yaml: 'YAML',
  yml: 'YAML',
  toml: 'TOML',
  ini: 'INI',
  sql: 'SQL',
  graphql: 'GraphQL',
  css: 'CSS',
  scss: 'SCSS',
  html: 'HTML',
  vue: 'Vue',
  svelte: 'Svelte',
  xml: 'XML',
  md: 'Markdown',
  markdown: 'Markdown',
  mdx: 'MDX',
  diff: 'Diff',
  http: 'HTTP',
  go: 'Go',
  rust: 'Rust',
  rs: 'Rust',
  java: 'Java',
  c: 'C',
  cpp: 'C++',
  csharp: 'C#',
  cs: 'C#',
  php: 'PHP',
  ruby: 'Ruby',
  rb: 'Ruby',
  dockerfile: 'Dockerfile',
  nginx: 'Nginx',
}

// 題簽的語言圖示：用品牌 logo 的「形」辨識，但一律單色（currentColor、muted）。
// 不用品牌原色——飽和的藍黃橘會跳出宣紙色調，Rust／JSON／MDX 的黑色在夜讀時也會消失（DESIGN.md 原則 1）。
type IconComponent = React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
const LANG_ICONS: Record<string, IconComponent> = {
  ts: SiTypescript,
  typescript: SiTypescript,
  tsx: SiReact,
  jsx: SiReact,
  js: SiJavascript,
  javascript: SiJavascript,
  py: SiPython,
  python: SiPython,
  sh: SiGnubash,
  shell: SiGnubash,
  bash: SiGnubash,
  zsh: SiGnubash,
  powershell: SquareTerminal,
  ps1: SquareTerminal,
  json: SiJson,
  jsonc: SiJson,
  yaml: SiYaml,
  yml: SiYaml,
  toml: SiToml,
  graphql: SiGraphql,
  css: SiCss,
  scss: SiSass,
  html: SiHtml5,
  vue: SiVuedotjs,
  svelte: SiSvelte,
  xml: SiXml,
  md: SiMarkdown,
  markdown: SiMarkdown,
  mdx: SiMdx,
  go: SiGo,
  rust: SiRust,
  rs: SiRust,
  java: SiOpenjdk,
  c: SiC,
  cpp: SiCplusplus,
  csharp: SiDotnet,
  cs: SiDotnet,
  php: SiPhp,
  ruby: SiRuby,
  rb: SiRuby,
  dockerfile: SiDocker,
  nginx: SiNginx,
}

export interface CodeBlockHeaderProps {
  /** fenced code block 的語言（例如 ts、python），沒有標記語言時顯示「純文字」 */
  lang?: string
  /** ```ts title="vite.config.ts" 的檔名，有的話題簽顯示檔名、語言改當 tooltip */
  title?: string
  /** 畫面上的純文字程式碼（含 [!code --] 刪除行），用來計算行數 */
  codeText: string
  /** 複製到剪貼簿的內容（不含刪除行），省略時同 codeText */
  copyText?: string
  /** 已高亮的 <pre><code> 內容 */
  children: React.ReactNode
}

type CopyState = 'idle' | 'done' | 'failed'

/**
 * 包在 Shiki 高亮過的 <pre> 外層，照「紙上之物」的骨架：
 * 題簽（語言＋換行／複製工具）→ 程式碼 → 太長時的展開註腳。
 */
export function CodeBlockHeader({
  lang,
  title,
  codeText,
  copyText = codeText,
  children,
}: CodeBlockHeaderProps) {
  const [copy, setCopy] = useState<CopyState>('idle')
  const [wrap, setWrap] = useState(false)
  const lineCount = codeText.split('\n').length
  const isLong = lineCount > COLLAPSE_LINE_THRESHOLD
  const [collapsed, setCollapsed] = useState(isLong)
  const rootRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [fullHeight, setFullHeight] = useState<number>()

  // 持續量測實際內容高度（scrollHeight 在 overflow-hidden 收合時依然準確），
  // 展開時才有正確的目標高度可以過渡動畫，而不是用一個很大的假高度硬做。
  // 開關自動換行會改變高度，ResizeObserver 一併接住。
  useEffect(() => {
    if (!isLong || !contentRef.current) return
    const el = contentRef.current
    const observer = new ResizeObserver(() => setFullHeight(el.scrollHeight))
    observer.observe(el.firstElementChild ?? el)
    return () => observer.disconnect()
  }, [isLong])

  useEffect(() => {
    if (copy === 'idle') return
    const timer = setTimeout(() => setCopy('idle'), 2000)
    return () => clearTimeout(timer)
  }, [copy])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyText)
      setCopy('done')
    } catch {
      setCopy('failed')
    }
  }

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    // 從很長的程式碼底部收合時，區塊頂端已經捲出畫面；捲回來，讀者才不會迷路
    if (next) {
      const root = rootRef.current
      if (root && root.getBoundingClientRect().top < 0) {
        root.scrollIntoView({ block: 'start', behavior: 'smooth' })
      }
    }
  }

  const key = lang?.toLowerCase()
  const label =
    !key || key === 'text' || key === 'plaintext' || key === 'txt'
      ? m.code_plain_text()
      : (LANG_LABELS[key] ?? lang)
  const LangIcon = (key && LANG_ICONS[key]) || FileCode2
  const copyLabel =
    copy === 'done'
      ? m.code_copied()
      : copy === 'failed'
        ? m.code_copy_failed()
        : m.code_copy()

  return (
    <figure
      ref={rootRef}
      className="mdx-block mdx-frame mdx-code not-prose scroll-mt-24"
      data-wrap={wrap || undefined}
    >
      <figcaption className="mdx-block-head">
        <span className="mdx-block-label" title={title ? label : undefined}>
          <LangIcon aria-hidden />
          <span className="mdx-block-label-text mdx-mono" data-filename={title ? '' : undefined}>
            {title ?? label}
          </span>
        </span>
        <span className="mdx-tools">
          <button
            type="button"
            className="mdx-tool"
            aria-pressed={wrap}
            aria-label={m.code_wrap()}
            title={m.code_wrap()}
            onClick={() => setWrap((v) => !v)}
          >
            <WrapText aria-hidden />
          </button>
          <button
            type="button"
            className="mdx-tool"
            data-done={copy === 'done' || undefined}
            aria-label={copyLabel}
            title={m.code_copy()}
            onClick={handleCopy}
          >
            {copy === 'done' ? (
              <CheckIcon aria-hidden />
            ) : copy === 'failed' ? (
              <XIcon aria-hidden />
            ) : (
              <CopyIcon aria-hidden />
            )}
            {copy !== 'idle' && <span>{copyLabel}</span>}
          </button>
        </span>
        <span className="sr-only" aria-live="polite">
          {copy === 'idle' ? '' : copyLabel}
        </span>
      </figcaption>
      <div
        ref={contentRef}
        className="mdx-code-body"
        data-collapsible={isLong || undefined}
        data-collapsed={(isLong && collapsed) || undefined}
        style={
          isLong
            ? { maxHeight: collapsed ? COLLAPSED_HEIGHT : fullHeight }
            : undefined
        }
      >
        {children}
      </div>
      {isLong && (
        <button
          type="button"
          className="mdx-block-foot"
          aria-expanded={!collapsed}
          onClick={toggleCollapsed}
        >
          <ChevronDownIcon aria-hidden />
          {collapsed
            ? m.code_expand({
                count: lineCount,
              })
            : m.code_collapse()}
        </button>
      )}
    </figure>
  )
}
