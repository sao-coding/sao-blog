import { compile } from '@mdx-js/mdx'
import matter from 'gray-matter'
import type { TocItem } from '@/types/toc'
import { calculateSomeHow } from '@/utils'
import getMdxOptions, { getBasicMdxOptions } from '@/components/mdx/parsers'

export type MdxVariant = 'full' | 'basic'

// gray-matter 回傳 Record<string, any>，但 createServerFn 要求回傳值可被
// 型別層級驗證為可序列化 —— `unknown`/`any` 索引簽章過不了那個檢查，
// 因此收斂成本專案 frontmatter 實際會用到的欄位形狀（皆為 JSON 原生型別）。
export type MdxFrontmatter = {
  title?: string
  description?: string
  keywords?: string
  author?: string
  date?: string
  showToc?: boolean
}

export type CompiledMdx = {
  compiledSource: string
  toc: TocItem[]
  frontmatter: MdxFrontmatter
  readingTime: string
}

// 伺服器端專用：把原始 MDX 原始碼（可能含 frontmatter）編譯成純 JS 原始碼字串
// （outputFormat: 'function-body'，可 JSON 序列化，交給 client 用 runSync 執行）。
// compileMdx server fn 與 preview-action.ts 的預覽功能都靠這支共用邏輯，
// 確保「預覽」與「正式頁面」用同一組 remark/rehype 設定編譯。
export async function compileMdxSource(
  source: string,
  variant: MdxVariant
): Promise<CompiledMdx> {
  const { content, data: frontmatter } = matter(source)
  const { remarkPlugins, rehypePlugins } =
    variant === 'basic' ? getBasicMdxOptions() : getMdxOptions()

  const vfile = await compile(content, {
    remarkPlugins,
    rehypePlugins,
    outputFormat: 'function-body',
  })

  return {
    compiledSource: String(vfile),
    toc: (vfile.data.toc as TocItem[] | undefined) ?? [],
    frontmatter,
    readingTime: calculateSomeHow(content),
  }
}
