import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { compileMdx, type CompiledContent, type CompileError } from '@sao-blog/mdx'
import { CompiledMdx } from '@/lib/mdx/compiled-mdx'
import { LetterPaper } from '@/components/letter-paper'
import { WrittenOn } from '@/components/written-season'
import { pageHead } from '@/lib/seo'

// 後台編輯器的即時預覽：admin 以 iframe 嵌入這頁，透過 postMessage 把編輯中的內容傳進來，
// 用與正式頁面同一條編譯管線（@sao-blog/mdx）與同一組 MDX 元件渲染，所見即所得。
//
// 訊息協定（admin → 這頁）：
//   { type: 'sao-preview:update', title, cover, content, profile, createdAt, dark }
//   { type: 'sao-preview:scroll', ratio }   // 0–1，跟著編輯器捲動
// （這頁 → admin）：
//   { type: 'sao-preview:ready' }
//   { type: 'sao-preview:status', ok, errors }

const compilePreview = createServerFn({ method: 'POST' })
  .validator(z.object({ source: z.string(), profile: z.enum(['post', 'note']) }))
  .handler(
    async ({
      data,
    }): Promise<{ ok: true; compiled: CompiledContent } | { ok: false; errors: CompileError[] }> => {
      const result = await compileMdx(data.source, { profile: data.profile })
      if (!result.ok) return { ok: false, errors: result.errors }
      return { ok: true, compiled: result.compiled }
    }
  )

export const Route = createFileRoute('/editor-preview')({
  head: () => pageHead({ title: '預覽', path: '/editor-preview', noindex: true }),
  component: EditorPreviewPage,
})

interface PreviewPayload {
  title: string
  cover: string | null
  content: string
  profile: 'post' | 'note'
  createdAt: string
  dark: boolean
}

function EditorPreviewPage() {
  const [payload, setPayload] = useState<PreviewPayload | null>(null)
  const [compiled, setCompiled] = useState<CompiledContent | null>(null)
  const [errors, setErrors] = useState<CompileError[]>([])
  const requestId = useRef(0)

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window.parent || typeof event.data !== 'object' || !event.data) return
      const msg = event.data as { type?: string } & Partial<PreviewPayload> & { ratio?: number }
      if (msg.type === 'sao-preview:update') {
        setPayload(msg as PreviewPayload)
      } else if (msg.type === 'sao-preview:scroll' && typeof msg.ratio === 'number') {
        const max = document.documentElement.scrollHeight - window.innerHeight
        window.scrollTo({ top: max * msg.ratio })
      }
    }
    window.addEventListener('message', onMessage)
    window.parent.postMessage({ type: 'sao-preview:ready' }, '*')
    return () => window.removeEventListener('message', onMessage)
  }, [])

  // 跟著後台的明暗模式
  useEffect(() => {
    if (payload) document.documentElement.classList.toggle('dark', payload.dark)
  }, [payload?.dark])

  useEffect(() => {
    if (!payload) return
    const id = ++requestId.current
    compilePreview({ data: { source: payload.content, profile: payload.profile } })
      .then((res) => {
        if (id !== requestId.current) return
        // 編譯失敗時保留上一次成功的畫面，只回報錯誤，打字到一半不會整頁閃掉
        if (res.ok) setCompiled(res.compiled)
        setErrors(res.ok ? [] : res.errors)
        window.parent.postMessage(
          { type: 'sao-preview:status', ok: res.ok, errors: res.ok ? [] : res.errors },
          '*'
        )
      })
      .catch((err: unknown) => {
        if (id !== requestId.current) return
        const message = err instanceof Error ? err.message : String(err)
        setErrors([{ message }])
        window.parent.postMessage({ type: 'sao-preview:status', ok: false, errors: [{ message }] }, '*')
      })
  }, [payload?.content, payload?.profile])

  if (!payload) {
    return <p className="p-8 text-center text-sm text-muted-foreground">等待編輯器內容…</p>
  }

  return (
    // 信箋底下疊的兩張紙往右下偏移 16px（.letter-sheet），右側要留出空間；
    // overflow-x-clip 保險，預覽窗格很窄時也不會出現橫向捲軸
    <div className="mx-auto w-full max-w-[920px] overflow-x-clip py-4 pr-7 pl-3 sm:py-6 sm:pr-9 sm:pl-5">
      {errors.length > 0 && (
        <div className="sticky top-2 z-10 mb-4 rounded-lg border border-destructive/40 glass-strong p-3 text-xs text-destructive shadow-sm">
          {errors.slice(0, 3).map((e, i) => (
            <p key={i}>
              {e.line ? `第 ${e.line} 行：` : ''}
              {e.message}
            </p>
          ))}
        </div>
      )}
      <LetterPaper date={payload.createdAt}>
        <header className="mb-8">
          <h1 className="font-wenkai text-3xl leading-snug text-foreground text-balance sm:text-4xl">
            {payload.title || '（未命名）'}
          </h1>
          <WrittenOn date={payload.createdAt} className="mt-3" />
        </header>
        {payload.cover && (
          <img src={payload.cover} alt="" className="mb-6 aspect-video w-full rounded-lg object-cover" />
        )}
        <article className="prose dark:prose-invert max-w-full">
          <CompiledMdx compiled={compiled} />
        </article>
      </LetterPaper>
    </div>
  )
}
