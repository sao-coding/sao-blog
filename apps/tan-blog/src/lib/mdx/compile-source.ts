import {
  COMPILED_VERSION,
  compileMdx,
  type CompiledContent,
  type CompileError,
  type TocItem,
} from '@sao-blog/mdx'

export type MdxVariant = 'full' | 'basic'

// createServerFn 要求回傳值可被型別層級驗證為可序列化 —— `unknown` 索引簽章
// 過不了那個檢查，因此收斂成本專案 frontmatter 實際會用到的欄位形狀。
export type MdxFrontmatter = {
  title?: string
  description?: string
  keywords?: string
  author?: string
  date?: string
  showToc?: boolean
}

export type CompiledMdx = {
  /** hast JSON（純資料），交給 <CompiledMdx> 渲染，不在 client 執行任何 MDX */
  compiled: CompiledContent
  toc: TocItem[]
  frontmatter: MdxFrontmatter
  plainText: string
  /** 預估閱讀時間（分鐘） */
  readingTime: number
}

export class MdxCompileError extends Error {
  constructor(readonly errors: CompileError[]) {
    super(
      errors
        .map((e) => (e.line ? `第 ${e.line} 行：${e.message}` : e.message))
        .join('\n')
    )
    this.name = 'MdxCompileError'
  }
}

// 伺服器端專用：用 @sao-blog/mdx 把原始 MDX（可含 frontmatter）編譯成 hast JSON。
// 頁面 loader、compileMdx server fn 與預覽都靠這支共用邏輯，確保「預覽」與
// 「正式頁面」走同一條編譯管線。編譯失敗（未知元件、JS 表達式等）會丟出
// MdxCompileError，訊息帶行號。
export async function compileMdxSource(
  source: string,
  variant: MdxVariant
): Promise<CompiledMdx> {
  const result = await compileMdx(source, {
    profile: variant === 'basic' ? 'note' : 'post',
  })
  if (!result.ok) throw new MdxCompileError(result.errors)

  return {
    compiled: result.compiled,
    toc: result.toc,
    frontmatter: result.frontmatter as MdxFrontmatter,
    plainText: result.plainText,
    readingTime: result.readingTime,
  }
}

/**
 * API（getPost / getNote）已附發布時預編譯的 compiled / toc 時直接採用；
 * 沒有（舊 API、或後端編譯失敗回 null）才在這裡編譯原文。
 */
export async function resolveCompiled(
  data: {
    content: string
    compiled?: CompiledContent | null
    toc?: TocItem[] | null
    readingTime?: number | null
  },
  variant: MdxVariant
): Promise<Omit<CompiledMdx, 'plainText'>> {
  if (data.compiled?.v === COMPILED_VERSION) {
    return {
      compiled: data.compiled,
      toc: data.toc ?? [],
      frontmatter: (data.compiled.frontmatter ?? {}) as MdxFrontmatter,
      readingTime: data.readingTime ?? 0,
    }
  }
  const { plainText: _plainText, ...rest } = await compileMdxSource(data.content, variant)
  return rest
}
