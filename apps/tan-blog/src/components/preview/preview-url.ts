import type { PreviewKind } from './preview-types'

// go-to 的值即為真實文章路徑（去掉開頭斜線），例如：
//   posts/my-slug  ->  /posts/my-slug
//   notes/abc123   ->  /notes/abc123

export interface ParsedGoTo {
  type: PreviewKind
  id: string
  href: string
}

export function parseGoTo(value: string | null): ParsedGoTo | null {
  if (!value) return null
  const [segment, ...rest] = value.split('/')
  const id = rest.join('/')
  if (!segment || !id) return null
  return {
    type: segment === 'notes' ? 'note' : 'post',
    id,
    href: `/${value}`,
  }
}

/**
 * 在連結 onClick 中呼叫：用 History API 淺層更新 URL 開啟預覽。
 * 因為走 pushState 而非 router 導航，所以不會觸發伺服器重新渲染／重抓當前頁面列表。
 *
 * 這個模組刻意保持輕量（不 import 任何 MDX 元件），讓只需要觸發預覽的頁面
 * 不會把整包預覽渲染程式碼打進 bundle。
 */
export function openArticlePreview(goTo: string) {
  const params = new URLSearchParams(window.location.search)
  params.set('go-to', goTo)
  window.history.pushState(null, '', `${window.location.pathname}?${params}`)
}

export function removeGoToUrl() {
  const params = new URLSearchParams(window.location.search)
  params.delete('go-to')
  const qs = params.toString()
  return qs ? `${window.location.pathname}?${qs}` : window.location.pathname
}
