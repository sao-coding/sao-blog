import type { TocItem as FlexibleTocItem } from 'remark-flexible-toc'

/** 目錄項目（去掉 remark-flexible-toc 的 `data` 欄位，確保可 JSON 序列化） */
export type TocItem = Omit<FlexibleTocItem, 'data'>

/**
 * 編譯產物的結構版本。hast 結構或元件契約有不相容變更時遞增，
 * 讓各端 renderer（Web / 未來的 App）判斷自己是否看得懂。
 */
export const COMPILED_VERSION = 1

// ─── 跨平台渲染契約：hast 的 JSON 子集 ───────────────────────────────────────
// 不直接用 @types/hast：它的 `data` 欄位會被各 remark / rehype 套件的型別擴充加入
// 非序列化的欄位，而編譯產物在存檔前已移除 data / position。這裡只描述實際會出現的資料。

export type HastJsonPropertyValue = string | number | boolean | null | (string | number)[]

export interface HastJsonElement {
  type: 'element'
  /** HTML 標籤（小寫）或 registry 元件名稱（大寫開頭） */
  tagName: string
  properties: Record<string, HastJsonPropertyValue>
  children: HastJsonNode[]
}

export interface HastJsonText {
  type: 'text'
  value: string
}

export interface HastJsonComment {
  type: 'comment'
  value: string
}

export type HastJsonNode = HastJsonElement | HastJsonText | HastJsonComment

export interface HastJsonRoot {
  type: 'root'
  children: HastJsonNode[]
}

/** 發布時編譯結果：純資料（hast JSON），任何平台都能走訪渲染。 */
export interface CompiledContent {
  v: typeof COMPILED_VERSION
  tree: HastJsonRoot
  /** frontmatter 中的純量值（例如 showToc）；舊資料可能沒有此欄位 */
  frontmatter?: Record<string, string | number | boolean | null>
}

/**
 * 編譯設定檔：
 * - `post`：完整功能（含數學公式 / KaTeX）
 * - `note`：日記用的精簡版（無數學）
 */
export type CompileProfile = 'post' | 'note'

export interface CompileError {
  line?: number
  column?: number
  message: string
}

export interface CompileSuccess {
  ok: true
  compiled: CompiledContent
  toc: TocItem[]
  /** 去除標記後的純文字，給搜尋 / RSS / 摘要 / AI 用 */
  plainText: string
  /** 預估閱讀時間（分鐘） */
  readingTime: number
  /** 原始 MDX 的 sha256（hex），用來判斷 compiled 是否過期 */
  hash: string
  frontmatter: Record<string, unknown>
}

export interface CompileFailure {
  ok: false
  errors: CompileError[]
}

export type CompileResult = CompileSuccess | CompileFailure
