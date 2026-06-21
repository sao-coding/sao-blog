'use client'

import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

// 觸發預覽用的輕量 helper，重新匯出方便其他頁面引用。
// 注意：需要觸發預覽的頁面請直接 import '@/components/preview/preview-url'，
// 以免把這支 wrapper（含 dynamic import）也打進該頁 bundle。
export { openArticlePreview } from './preview-url'

// 實際的預覽內容（含 MDXClient 與所有 MDX 區塊元件）以 next/dynamic 懶載入，
// 只有在使用者第一次開啟預覽時才會下載這段程式碼。
const ArticlePreviewModalContent = dynamic(
  () =>
    import('./article-preview-content').then(
      (m) => m.ArticlePreviewModalContent
    ),
  { ssr: false }
)

/**
 * 共用預覽彈窗（懶載入版）：監聽 URL 的 `?go-to=` 參數彈出「渲染後」的文章／日記預覽。
 * 任何頁面只要：
 *   1. 在連結 onClick 呼叫 openArticlePreview('posts/<slug>' | 'notes/<id>')
 *   2. 在頁面內放一個 <ArticlePreviewModal />（需用 <Suspense> 包住）
 *
 * 在第一次開啟預覽前，不會載入較重的渲染程式碼；開啟後保持掛載以保留關閉動畫。
 */
export function ArticlePreviewModal() {
  const searchParams = useSearchParams()
  const hasGoTo = searchParams.get('go-to') !== null

  // 一旦曾經開啟就保持掛載，讓 Dialog 的關閉動畫能正常播放。
  const [mounted, setMounted] = useState(hasGoTo)
  useEffect(() => {
    if (hasGoTo) setMounted(true)
  }, [hasGoTo])

  if (!mounted) return null
  return <ArticlePreviewModalContent />
}
