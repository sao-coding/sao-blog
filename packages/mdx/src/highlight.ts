import type { Element, Root, RootContent } from 'hast'
import { createHighlighterCore, type HighlighterCore } from 'shiki/core'
import { createOnigurumaEngine } from 'shiki/engine/oniguruma'
import {
  transformerMetaHighlight,
  transformerNotationDiff,
  transformerNotationFocus,
  transformerNotationHighlight,
} from '@shikijs/transformers'
import { transformerColorizedBrackets } from '@shikijs/colorized-brackets'

// 淺色用 kanagawa-lotus（取自北齋浮世繪的暖紙色系），和宣紙底比較搭
const SHIKI_THEMES = { light: 'kanagawa-lotus', dark: 'github-dark' } as const

// fine-grained bundle：明確列出部落格實際會用到的語言，而不是像
// `shiki` 主要入口那樣預設打包全部 200+ 種語言。除了縮小 bundle、加快冷啟動
// （實測全量載入冷啟動要 50 秒以上），也能避免部分語言之間的內嵌文法
// 互相牽連載入（例如載入全部語言時，markdown 相關內容會把 mermaid 的文法也
// 連帶載入，讓單純用 `langs` 排除 'mermaid' 失效）。
// 清單以外的語言會 fallback 顯示成純文字（見下面 targetLang 邏輯）。
// 每個語言要各自寫一個 import()（不能用變數組字串動態 import），
// 否則 bundler 沒辦法對 package.json 的 exports 做 pattern 解析。
const loadLangs = () => [
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
// 保留原始 <pre><code> 交給各端 renderer 渲染成圖表。
export const DIAGRAM_LANGS = new Set(['mermaid', 'echarts'])

// fine-grained bundle 需要自己維護 singleton，避免每次編譯都重新載入語言/主題。
let highlighterPromise: Promise<HighlighterCore> | undefined
function getHighlighter() {
  highlighterPromise ??= createHighlighterCore({
    themes: [
      import('@shikijs/themes/kanagawa-lotus'),
      import('@shikijs/themes/github-dark'),
    ],
    langs: loadLangs(),
    engine: createOnigurumaEngine(() => import('shiki/wasm')),
  })
  return highlighterPromise
}

const isElement = (node: unknown): node is Element =>
  (node as Element | undefined)?.type === 'element'

export function hastToText(node: Root | RootContent): string {
  if (node.type === 'text') return node.value
  if ('children' in node) return node.children.map(hastToText).join('')
  return ''
}

function getCodeNode(preNode: Element): Element | undefined {
  return preNode.children.find(
    (child): child is Element => isElement(child) && child.tagName === 'code'
  )
}

export function getLanguage(codeNode: Element): string | undefined {
  const classes = codeNode.properties.className
  if (!Array.isArray(classes)) return undefined
  const languageClass = classes.find(
    (c): c is string => typeof c === 'string' && c.startsWith('language-')
  )
  return languageClass?.slice('language-'.length)
}

// 自己寫 rehype plugin（而不是用 @shikijs/rehype 這個現成套件）的原因：
// 我們需要在「拿到語言」的那一刻就決定要不要跳過，讓 mermaid/echarts 完全
// 不經過 shiki；@shikijs/rehype 沒有這種依語言排除單一節點的 hook。
export function rehypeCodeHighlight() {
  return async (tree: Root) => {
    const highlighter = await getHighlighter()
    const loadedLangs = new Set(highlighter.getLoadedLanguages())

    const targets: { parent: Root | Element; index: number; node: Element }[] =
      []
    const collect = (node: Root | Element) => {
      node.children.forEach((child, index) => {
        if (!isElement(child)) return
        if (child.tagName === 'pre') {
          targets.push({ parent: node, index, node: child })
          return // <pre> 不會巢狀 <pre>，不用往下找
        }
        collect(child)
      })
    }
    collect(tree)

    for (const { parent, index, node } of targets) {
      const codeNode = getCodeNode(node)
      if (!codeNode) continue

      const lang = getLanguage(codeNode)
      if (lang && DIAGRAM_LANGS.has(lang)) continue

      // 沒標語言、或標了 shiki 不支援的語言（例如 caddyfile），一律當作 text
      const targetLang = lang && loadedLangs.has(lang) ? lang : 'text'

      let code = hastToText(codeNode)
      if (code.endsWith('\n')) code = code.slice(0, -1)

      // fenced code block 語言後面接的 meta 字串（例如 ```ts {1,3-5}```）
      // 交給 transformerMetaHighlight 解析成要高亮的行號範圍
      const metaRaw = (codeNode.data as { meta?: string } | undefined)?.meta ?? ''

      // 程式碼內的註解標記（標記本身會從輸出拿掉）：
      //   // [!code ++] / [!code --]    新增／刪除的行（.diff.add / .diff.remove）
      //   // [!code focus]               聚焦，其餘行淡掉（.focused，pre 加 .has-focused）
      //   // [!code highlight]           高亮，同 {1,3} meta（.highlighted）
      const highlighted = highlighter.codeToHast(code, {
        lang: targetLang,
        themes: SHIKI_THEMES,
        defaultColor: false,
        meta: { __raw: metaRaw },
        transformers: [
          transformerMetaHighlight(),
          transformerNotationDiff(),
          transformerNotationFocus(),
          transformerNotationHighlight(),
          transformerColorizedBrackets(),
        ],
      })

      const newPre = highlighted.children[0]
      if (!isElement(newPre)) continue
      // ```ts title="vite.config.ts"：檔名放在 pre 的 data-title，renderer 顯示在題簽
      const title = metaRaw.match(/\btitle=(?:"([^"]*)"|'([^']*)')/)
      if (title) {
        newPre.properties = { ...newPre.properties, dataTitle: title[1] ?? title[2] }
      }
      const newCode = getCodeNode(newPre)
      if (newCode) {
        newCode.properties = {
          ...newCode.properties,
          className: [`language-${targetLang}`],
        }
      }
      parent.children[index] = newPre
    }
  }
}
