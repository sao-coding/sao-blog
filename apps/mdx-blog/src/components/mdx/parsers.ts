import type { EvaluateOptions } from 'next-mdx-remote-client/rsc'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import remarkFlexibleToc, { TocItem } from 'remark-flexible-toc'
import rehypeSlug from 'rehype-slug'
import { createHighlighterCore, type HighlighterCore } from 'shiki/core'
import { createOnigurumaEngine } from 'shiki/engine/oniguruma'
import { transformerMetaHighlight } from '@shikijs/transformers'
import { transformerColorizedBrackets } from '@shikijs/colorized-brackets'
import { calculateSomeHow } from '@/utils'

type Scope = {
  readingTime: string
  toc?: TocItem[]
}

type HastNode = {
  type: string
  tagName?: string
  properties?: Record<string, unknown>
  children?: HastNode[]
  value?: string
  data?: { meta?: string }
}

const SHIKI_THEMES = { light: 'github-light', dark: 'github-dark' } as const

// fine-grained bundle：明確列出部落格實際會用到的語言，而不是像
// `shiki` 主要入口那樣預設打包全部 200+ 種語言。除了縮小 bundle、加快冷啟動
// （實測全量載入冷啟動要 50 秒以上），也能避免部分語言之間的內嵌文法
// 互相牽連載入（例如載入全部語言時，markdown 相關內容會把 mermaid 的文法也
// 連帶載入，讓單純用 `langs` 排除 'mermaid' 失效）。
// 清單以外的語言會 fallback 顯示成純文字（見下面 targetLang 邏輯）。
// 每個語言要各自寫一個 import()（不能用變數組字串動態 import），
// 否則 Turbopack 沒辦法對 package.json 的 exports 做 pattern 解析。
const SHIKI_LANGS = [
  import('@shikijs/langs/typescript'),
  import('@shikijs/langs/javascript'),
  import('@shikijs/langs/jsx'),
  import('@shikijs/langs/tsx'),
  import('@shikijs/langs/python'),
  import('@shikijs/langs/bash'),
  import('@shikijs/langs/powershell'),
  import('@shikijs/langs/dockerfile'),
  import('@shikijs/langs/json'),
  import('@shikijs/langs/jsonc'),
  import('@shikijs/langs/yaml'),
  import('@shikijs/langs/toml'),
  import('@shikijs/langs/ini'),
  import('@shikijs/langs/nginx'),
  import('@shikijs/langs/sql'),
  import('@shikijs/langs/graphql'),
  import('@shikijs/langs/css'),
  import('@shikijs/langs/scss'),
  import('@shikijs/langs/html'),
  import('@shikijs/langs/vue'),
  import('@shikijs/langs/svelte'),
  import('@shikijs/langs/xml'),
  import('@shikijs/langs/markdown'),
  import('@shikijs/langs/mdx'),
  import('@shikijs/langs/diff'),
  import('@shikijs/langs/http'),
  import('@shikijs/langs/go'),
  import('@shikijs/langs/rust'),
  import('@shikijs/langs/java'),
  import('@shikijs/langs/c'),
  import('@shikijs/langs/cpp'),
  import('@shikijs/langs/csharp'),
  import('@shikijs/langs/php'),
  import('@shikijs/langs/ruby'),
]

// `mermaid`/`echarts` fenced blocks 是圖表原始碼，不是要高亮的程式碼，
// 交給 index.tsx 的 code 元件攔截渲染成圖表。
const DIAGRAM_LANGS = new Set(['mermaid', 'echarts'])

// fine-grained bundle 需要自己維護 singleton（不像 getSingletonHighlighter
// 是套件內建的），避免每次編譯 MDX 都重新載入一次語言/主題。
let highlighterPromise: Promise<HighlighterCore> | undefined
function getHighlighter() {
  highlighterPromise ??= createHighlighterCore({
    themes: [
      import('@shikijs/themes/github-light'),
      import('@shikijs/themes/github-dark'),
    ],
    langs: SHIKI_LANGS,
    engine: createOnigurumaEngine(() => import('shiki/wasm')),
  })
  return highlighterPromise
}

function hastToText(node: HastNode): string {
  if (node.type === 'text') return node.value ?? ''
  return node.children?.map(hastToText).join('') ?? ''
}

function getCodeNode(preNode: HastNode): HastNode | undefined {
  return preNode.children?.find(
    (child) => child.type === 'element' && child.tagName === 'code'
  )
}

function getLanguage(codeNode: HastNode): string | undefined {
  const classes = codeNode.properties?.className
  if (!Array.isArray(classes)) return undefined
  const languageClass = classes.find(
    (c): c is string => typeof c === 'string' && c.startsWith('language-')
  )
  return languageClass?.slice('language-'.length)
}

// 自己寫 rehype plugin（而不是用 @shikijs/rehype 這個現成套件）的原因：
// 我們需要在「拿到語言」的那一刻就決定要不要跳過，讓 mermaid/echarts 完全
// 不經過 shiki；@shikijs/rehype 沒有這種依語言排除單一節點的 hook。
function rehypeCodeHighlight() {
  return async (tree: HastNode) => {
    const highlighter = await getHighlighter()
    const loadedLangs = new Set(highlighter.getLoadedLanguages())

    const targets: { parent: HastNode; index: number; node: HastNode }[] = []
    const collect = (node: HastNode, parent?: HastNode, index?: number) => {
      if (node.type === 'element' && node.tagName === 'pre') {
        if (parent && index !== undefined) targets.push({ parent, index, node })
        return // <pre> 不會巢狀 <pre>，不用往下找
      }
      node.children?.forEach((child, i) => collect(child, node, i))
    }
    collect(tree)

    for (const { parent, index, node } of targets) {
      const codeNode = getCodeNode(node)
      if (!codeNode) continue

      const lang = getLanguage(codeNode)
      // 一偵測到是圖表語言就直接跳過，保留原始 <pre><code> 給 Mermaid/Echarts 用
      if (lang && DIAGRAM_LANGS.has(lang)) continue

      // 沒標語言、或標了 shiki 不支援的語言（例如 caddyfile），一律當作 text
      const targetLang = lang && loadedLangs.has(lang) ? lang : 'text'

      let code = hastToText(codeNode)
      if (code.endsWith('\n')) code = code.slice(0, -1)

      // fenced code block 語言後面接的 meta 字串（例如 ```ts {1,3-5}```）
      // 交給 transformerMetaHighlight 解析成要高亮的行號範圍
      const metaRaw = codeNode.data?.meta ?? ''

      const highlighted = highlighter.codeToHast(code, {
        lang: targetLang,
        themes: SHIKI_THEMES,
        defaultColor: false,
        meta: { __raw: metaRaw },
        transformers: [transformerMetaHighlight(), transformerColorizedBrackets()],
      }) as unknown as { children: HastNode[] }

      const newPre = highlighted.children[0]
      const newCode = newPre && getCodeNode(newPre)
      if (newCode) {
        newCode.properties = {
          ...newCode.properties,
          className: [`language-${targetLang}`],
        }
      }
      parent.children![index] = newPre
    }
  }
}

type Frontmatter = {
  title: string
  description?: string
  keywords?: string
  author: string
  date?: string
  showToc?: boolean
}

// 完整 MDX 配置（用於文章，包含 TOC、數學、KaTeX 等）
const getMdxOptions = (source: string): EvaluateOptions<Scope> => ({
  mdxOptions: {
    remarkPlugins: [remarkGfm, remarkBreaks, remarkMath, remarkFlexibleToc],
    rehypePlugins: [rehypeKatex, rehypeSlug, rehypeCodeHighlight],
  },
  parseFrontmatter: true,
  scope: {
    readingTime: calculateSomeHow(source),
  },
  vfileDataIntoScope: 'toc', // 這行會把 toc 注入 scope.toc
})

// 較輕量的 MDX 配置（用於日記/備註，只需要 GFM 與 slug）
export const getBasicMdxOptions = (source: string): EvaluateOptions<Scope> => ({
  mdxOptions: {
    remarkPlugins: [remarkGfm, remarkBreaks, remarkFlexibleToc],
    rehypePlugins: [rehypeSlug, rehypeCodeHighlight],
  },
  parseFrontmatter: true,
  scope: {
    readingTime: calculateSomeHow(source),
  },
  vfileDataIntoScope: 'toc', // 這行會把 toc 注入 scope.toc
})

export default getMdxOptions
