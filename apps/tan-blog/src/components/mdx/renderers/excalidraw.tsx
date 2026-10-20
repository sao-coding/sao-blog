'use client'
import { useEffect, useRef, useState } from 'react'
import { Zoomable } from './zoomable'

// Excalidraw 手繪風圖表：抓 .excalidraw（JSON）→ 用 @excalidraw/excalidraw 的 exportToSvg 轉成靜態 SVG。
// - 套件很大，只在用到的文章、進入畫面時才動態載入，SSR 不碰
// - 不放編輯器，只顯示 SVG（跟 innei.in 的做法一樣）
// - 底色透明，直接畫在箋紙上；深色模式由 CSS 反相（.excalidraw-figure），切換主題不用重畫

// ── excalidraw.com 分享連結（https://excalidraw.com/#json=ID,KEY）────────────────
// 圖存在 excalidraw 後端，以 AES-GCM 加密、KEY 只在網址 # 後（不會送到伺服器）。
// 格式見 excalidraw 原始碼 data/encode.ts：
//   concatBuffers = [uint32 版本] + 多段 [uint32 長度][資料]
//   外層：[metadata JSON][iv][加密資料] → 解密 → zlib 解壓 → 內層：[metadata JSON][場景 JSON]
const SHARE_LINK = /#json=([\w-]+),([\w-]+)/

function splitBuffers(buf: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer>[] {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  const chunks: Uint8Array<ArrayBuffer>[] = []
  let cursor = 4 // 跳過版本號
  while (cursor < buf.byteLength) {
    const len = view.getUint32(cursor)
    cursor += 4
    chunks.push(buf.subarray(cursor, cursor + len))
    cursor += len
  }
  return chunks
}

async function loadShareLink(id: string, key: string): Promise<unknown> {
  const res = await fetch(`https://json.excalidraw.com/api/v2/${id}`)
  if (!res.ok) throw new Error(`excalidraw.com HTTP ${res.status}`)
  const [, iv, encrypted] = splitBuffers(new Uint8Array(await res.arrayBuffer()))
  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    { alg: 'A128GCM', ext: true, k: key, key_ops: ['encrypt', 'decrypt'], kty: 'oct' },
    { name: 'AES-GCM', length: 128 },
    false,
    ['decrypt'],
  )
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, encrypted)
  const inflated = await new Response(
    new Blob([decrypted]).stream().pipeThrough(new DecompressionStream('deflate')),
  ).arrayBuffer()
  const [, scene] = splitBuffers(new Uint8Array(inflated))
  return JSON.parse(new TextDecoder().decode(scene))
}

async function loadScene(src: string): Promise<unknown> {
  const share = src.match(SHARE_LINK)
  if (share) return loadShareLink(share[1], share[2])
  const res = await fetch(src)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready' }

export const MdxExcalidraw = ({ src, caption }: { src: string; caption?: string }) => {
  const ref = useRef<HTMLSpanElement>(null)
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let cancelled = false

    const render = async () => {
      try {
        const [scene, { exportToSvg, restore }] = await Promise.all([
          loadScene(src),
          import('@excalidraw/excalidraw'),
        ])
        // restore 會補齊舊版 .excalidraw 缺的欄位，避免 export 時壞掉
        const data = restore(scene as Parameters<typeof restore>[0], null, null)
        const svg = await exportToSvg({
          elements: data.elements,
          appState: { ...data.appState, exportBackground: false, exportWithDarkMode: false },
          files: data.files,
          exportPadding: 16,
        })
        if (cancelled) return
        svg.removeAttribute('width')
        svg.removeAttribute('height')
        svg.setAttribute('role', 'img')
        if (caption) svg.setAttribute('aria-label', caption)
        el.replaceChildren(svg)
        setState({ status: 'ready' })
      } catch (e) {
        if (!cancelled) setState({ status: 'error', message: e instanceof Error ? e.message : String(e) })
      }
    }

    // 進入畫面附近才載入
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect()
          void render()
        }
      },
      { rootMargin: '400px' },
    )
    io.observe(el)
    return () => {
      cancelled = true
      io.disconnect()
    }
  }, [src, caption])

  return (
    <figure className="excalidraw-figure not-prose my-8">
      <Zoomable label={caption} contentClassName="excalidraw-canvas">
        {/* ref 這層只放 exportToSvg 產生的 SVG（不給 React 管子節點） */}
        <span ref={ref} className="excalidraw-canvas block" />
      </Zoomable>
      {state.status === 'loading' && <div className="excalidraw-placeholder" />}
      {state.status === 'error' && (
        <p className="text-center text-sm text-destructive">圖表載入失敗：{state.message}</p>
      )}
      {caption && <figcaption className="mt-3 text-center text-sm text-muted-foreground">{caption}</figcaption>}
    </figure>
  )
}
