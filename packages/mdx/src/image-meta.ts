import type { Element, Root, RootContent } from 'hast'

/** 一張圖片的實際尺寸與模糊預覽（data URL）。由呼叫端提供取得方式（API 用 sharp） */
export interface ImageMeta {
  width: number
  height: number
  /** 很小的模糊預覽圖（data:image/webp;base64,…），載入前墊在圖片位置；沒有就不墊 */
  blur?: string
}

export type ImageMetaResolver = (src: string) => Promise<ImageMeta | null>

// 同時處理的圖片數：一篇文章十幾張圖時不要一次全部下載
const CONCURRENCY = 4

function collectImages(node: Root | Element, found: Element[]) {
  for (const child of node.children as RootContent[]) {
    if (child.type !== 'element') continue
    if (child.tagName === 'img' && typeof child.properties.src === 'string') found.push(child)
    else collectImages(child, found)
  }
}

/**
 * 編譯後替每個 <img> 補上實際的 width / height（與 dataBlur）：
 * 前台載入前就能用正確比例佔位，延遲載入的圖片不會在捲動途中把版面撐高（TOC 跳轉停在半路、CLS）。
 * 只在呼叫端傳入 resolver 時執行；抓不到（外部網站擋、逾時）就跳過那張，前台退回預設的 16:9 佔位。
 */
export async function applyImageMeta(tree: Root, resolve: ImageMetaResolver) {
  const images: Element[] = []
  collectImages(tree, images)
  let next = 0
  const worker = async () => {
    while (next < images.length) {
      const img = images[next++]!
      const meta = await resolve(img.properties.src as string).catch(() => null)
      if (!meta) continue
      img.properties.width = meta.width
      img.properties.height = meta.height
      if (meta.blur) img.properties.dataBlur = meta.blur
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, images.length) }, worker))
}
