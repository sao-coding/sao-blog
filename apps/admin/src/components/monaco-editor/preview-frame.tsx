import { useEffect, useRef, useState } from 'react'
import { CheckCircle2Icon, CircleAlertIcon, Loader2Icon } from 'lucide-react'
import { env } from '@sao-blog/env/admin'
import type { EditorDiagnostic } from './types'

// 嵌入前台 tan-blog 的 /editor-preview，用前台同一套編譯管線、元件與主題渲染，
// 所以預覽看到的就是發佈後的樣子。協定見 apps/tan-blog/src/routes/editor-preview.tsx。

export interface PreviewContent {
  title: string
  cover?: string | null
  content: string
  profile?: 'post' | 'note'
  createdAt?: Date | string
}

interface PreviewFrameProps extends PreviewContent {
  /** 編輯器捲動位置（0–1） */
  scrollRatio?: number
  onDiagnostics?: (errors: EditorDiagnostic[]) => void
}

const PREVIEW_URL = `${env.VITE_BLOG_URL}/editor-preview`
const PREVIEW_ORIGIN = new URL(env.VITE_BLOG_URL).origin

export function PreviewFrame({ title, cover, content, profile = 'post', createdAt, scrollRatio, onDiagnostics }: PreviewFrameProps) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [ready, setReady] = useState(false)
  const [state, setState] = useState<'compiling' | 'ok' | 'error'>('compiling')
  const [errorCount, setErrorCount] = useState(0)
  const onDiagnosticsRef = useRef(onDiagnostics)
  onDiagnosticsRef.current = onDiagnostics

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== PREVIEW_ORIGIN || event.source !== frameRef.current?.contentWindow) return
      const msg = event.data as { type?: string; ok?: boolean; errors?: EditorDiagnostic[] }
      if (msg.type === 'sao-preview:ready') setReady(true)
      if (msg.type === 'sao-preview:status') {
        setState(msg.ok ? 'ok' : 'error')
        setErrorCount(msg.errors?.length ?? 0)
        onDiagnosticsRef.current?.(msg.errors ?? [])
      }
    }
    window.addEventListener('message', onMessage)
    return () => {
      window.removeEventListener('message', onMessage)
      onDiagnosticsRef.current?.([])
    }
  }, [])

  // 打字時不要每個字都編譯一次
  const createdAtIso = createdAt ? new Date(createdAt).toISOString() : undefined
  useEffect(() => {
    if (!ready) return
    setState('compiling')
    const timer = setTimeout(() => {
      frameRef.current?.contentWindow?.postMessage(
        {
          type: 'sao-preview:update',
          title,
          cover: cover || null,
          content,
          profile,
          createdAt: createdAtIso ?? new Date().toISOString(),
          dark: document.documentElement.classList.contains('dark'),
        },
        PREVIEW_ORIGIN
      )
    }, 350)
    return () => clearTimeout(timer)
  }, [ready, title, cover, content, profile, createdAtIso])

  useEffect(() => {
    if (!ready || scrollRatio === undefined) return
    frameRef.current?.contentWindow?.postMessage({ type: 'sao-preview:scroll', ratio: scrollRatio }, PREVIEW_ORIGIN)
  }, [ready, scrollRatio])

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex items-center gap-2 border-b px-3 py-1.5 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">預覽</span>
        {!ready || state === 'compiling' ? (
          <span className="inline-flex items-center gap-1">
            <Loader2Icon className="size-3 animate-spin" />
            {ready ? '更新中' : '連線前台中'}
          </span>
        ) : state === 'ok' ? (
          <span className="inline-flex items-center gap-1 text-emerald-400">
            <CheckCircle2Icon className="size-3" />
            MDX 正常
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-destructive">
            <CircleAlertIcon className="size-3" />
            {errorCount} 個錯誤（已標在編輯器）
          </span>
        )}
        <span className="ml-auto hidden truncate opacity-70 sm:inline">與前台相同的渲染</span>
      </div>
      <iframe
        ref={frameRef}
        src={PREVIEW_URL}
        title="文章預覽"
        // 拖曳分割線時游標滑進 iframe 會被它吃掉事件、拖到一半卡住
        className="min-h-0 w-full flex-1 bg-background group-has-[[data-separator=active]]/split:pointer-events-none"
      />
    </div>
  )
}
