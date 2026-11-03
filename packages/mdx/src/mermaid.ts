import type { Element, Root, RootContent } from 'hast'
import { getLanguage, hastToText } from './highlight'

// mermaid 圖表在編譯階段就用 beautiful-mermaid 轉成 SVG（flowchart / state / sequence / class / ER / xychart），
// 存在 <code> 的 dataSvg 屬性上，前台直接顯示：瀏覽器不必下載 beautiful-mermaid 與它依賴的
// ELK 排版引擎（壓縮後數百 KB），換頁時也不用重算。
// 它不支援的圖（pie、gantt、mindmap…）不帶 dataSvg，前台退回 client 端的 mermaid。
//
// 顏色傳 CSS 變數，跟著宣紙／夜讀主題切換，所以同一份 SVG 晝夜通用。
// 它的 SVG 內部用 --muted / --border / --accent 等變數，沒給的話會繼承到站內同名的
// shadcn 變數（語意完全不同，例如 --muted 是底色，標籤字會消失），所以每個都明確給
const OPTIONS = {
  bg: 'var(--card)',
  fg: 'var(--foreground)',
  accent: 'var(--ink)',
  line: 'color-mix(in oklch, var(--foreground) 45%, transparent)',
  muted: 'var(--muted-foreground)',
  surface: 'color-mix(in oklch, var(--foreground) 4%, var(--card))',
  border: 'color-mix(in oklch, var(--foreground) 28%, transparent)',
  font: 'LXGW WenKai TC',
  transparent: true,
} as const

// beautiful-mermaid（連同 ELK）有副作用、無法被 tree-shake。前台會從本套件入口匯入型別與 registry，
// 靜態 import 會把它整包拖進瀏覽器的主 chunk，所以等到真的遇到 mermaid 圖時才動態載入（只會在伺服器端發生）
type RenderMermaidSVG = typeof import('beautiful-mermaid').renderMermaidSVG

function renderMermaid(render: RenderMermaidSVG, code: string): string | null {
  try {
    // 字型已由站內 Fontsource 載入，拿掉它自帶的 Google Fonts @import
    return render(code, OPTIONS).replace(/@import url\([^)]*\);?/g, '')
  } catch {
    return null
  }
}

function collect(node: Root | Element, found: Element[]) {
  for (const child of node.children as RootContent[]) {
    if (child.type !== 'element') continue
    if (child.tagName === 'code' && getLanguage(child) === 'mermaid') found.push(child)
    else collect(child, found)
  }
}

export function rehypeMermaid() {
  return async (tree: Root) => {
    const codes: Element[] = []
    collect(tree, codes)
    if (codes.length === 0) return
    const { renderMermaidSVG } = await import('beautiful-mermaid')
    for (const code of codes) {
      const svg = renderMermaid(renderMermaidSVG, hastToText(code).trim())
      if (svg) code.properties.dataSvg = svg
    }
  }
}
