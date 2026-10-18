// OG 圖 route 共用的小工具；放在 render-og-image.tsx 之外，讓 seo.ts
// （會進 client bundle）可以引用 URL 產生函式而不把 satori/resvg 帶進來。

export function ogAvatarUrl(request: Request) {
  return new URL('/img/avatar.jpg', request.url).toString()
}

export function formatOgDate(date: Date | string) {
  return new Date(date).toISOString().slice(0, 10)
}

export function postOgImagePath(slug: string) {
  return `/og/posts/${encodeURIComponent(slug)}`
}

export function noteOgImagePath(id: string) {
  return `/og/notes/${encodeURIComponent(id)}`
}

export function pageOgImagePath(title: string, description?: string) {
  const params = new URLSearchParams({ title })
  if (description) params.set('description', description)
  return `/og?${params.toString()}`
}
