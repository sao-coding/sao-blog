import { splitHighlight, type SearchHit } from '@sao-blog/api/lib/search/query'
import { cn } from '@/lib/utils'

// 命中字詞用文章裡 <Mark> 的赭黃螢光筆（blocks.css 的 .mdx-mark），不另訂一套高亮色。
// 高亮字串未 escape，一律切段後以文字渲染，不用 innerHTML
export function Highlighted({ text }: { text: string }) {
  return (
    <>
      {splitHighlight(text).map((part, i) =>
        part.mark ? (
          <mark key={i} className="mdx-mark" data-type="highlight" data-tone="amber">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </>
  )
}

/** 內文命中的片段（沒有命中內文時退回摘要） */
export function SearchSnippet({ hit, className }: { hit: SearchHit; className?: string }) {
  const text = hit.snippet ?? hit.summary
  if (!text) return null
  return (
    <p className={cn('search-snippet', className)}>
      <Highlighted text={text} />
    </p>
  )
}

/** 一筆搜尋結果：標題、片段、右側小字（語言或分類）。⌘K 清單用 */
export function SearchHitBody({ hit, aside }: { hit: SearchHit; aside?: string }) {
  return (
    <div className="search-hit">
      <div className="search-hit-head">
        <span className="search-hit-title">
          <Highlighted text={hit.titleHighlight ?? hit.title} />
        </span>
        {aside && <span className="search-hit-aside">{aside}</span>}
      </div>
      <SearchSnippet hit={hit} className="line-clamp-2" />
    </div>
  )
}
