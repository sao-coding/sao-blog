// 把 MDX/Markdown 原始碼轉成純文字摘要，給 meta description / OG 圖用。
// 不追求完整 parse（那要跑整條 unified pipeline），只剝掉常見語法，
// 避免 description 裡出現 `## 標題`、`<Alert>`、程式碼區塊這類雜訊。
export function mdxToPlainText(source: string, maxLength = 150): string {
  const text = source
    .replace(/^---[\s\S]*?---/, ' ') // frontmatter
    .replace(/^(import|export)\s.*$/gm, ' ') // MDX ESM
    .replace(/```[\s\S]*?```/g, ' ') // fenced code
    .replace(/\$\$[\s\S]*?\$\$/g, ' ') // block math
    .replace(/`([^`]*)`/g, '$1') // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links
    .replace(/<\/?[A-Za-z][^>]*>/g, ' ') // JSX / HTML tags
    .replace(/\{[^{}]*\}/g, ' ') // JSX expressions
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, '') // heading / quote / list markers
    .replace(/(\*\*|__|\*|~~)/g, '') // emphasis
    .replace(/\s+/g, ' ')
    .trim()

  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text
}
