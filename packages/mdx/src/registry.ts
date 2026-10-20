import { z } from 'zod'

/**
 * MDX 區塊元件登記表：跨平台渲染契約的單一來源。
 *
 * - `props`：zod schema（strict），編譯時驗證；未知 prop / 型別不符 → 編譯錯誤
 * - `children`：是否允許有子內容
 * - `translatableProps`：AI 翻譯時需要翻的字串 props
 *
 * 這裡只放「資料」，不含任何 React 元件，讓 server（API / MCP）與
 * 各端 renderer 共用。各端以元件名稱對應自己的實作。
 *
 * 互動元件擴充方向見 docs/plans/content-i18n-and-precompile.md §3.2：
 * 需要執行的程式碼一律以「資料」交給 <Playground>，在隔離的 sandbox 中執行。
 */

const color = z.enum(['blue', 'green', 'amber', 'red', 'purple', 'pink'])

export const PLAYGROUND_TEMPLATES = ['react', 'html', 'vanilla'] as const
export type PlaygroundTemplate = (typeof PLAYGROUND_TEMPLATES)[number]
/** Playground 內 code fence 可用的語言（瀏覽器端不做 bundling，只支援這幾種） */
export const PLAYGROUND_LANGS = ['html', 'css', 'js', 'jsx'] as const
export type PlaygroundLang = (typeof PLAYGROUND_LANGS)[number]

export interface ComponentSpec {
  description: string
  props: z.ZodObject
  children: boolean
  translatableProps: readonly string[]
}

const define = <T extends z.ZodRawShape>(spec: {
  description: string
  props: T
  children: boolean
  translatableProps?: readonly (keyof T & string)[]
}): ComponentSpec => ({
  description: spec.description,
  props: z.object(spec.props).strict(),
  children: spec.children,
  translatableProps: spec.translatableProps ?? [],
})

export const componentRegistry = {
  Alert: define({
    description: '提示框',
    props: {
      type: z.enum(['note', 'info', 'success', 'warning', 'danger']).optional(),
      title: z.string().optional(),
    },
    children: true,
    translatableProps: ['title'],
  }),
  Accordion: define({
    description: '折疊面板容器，子元素為 AccordionItem',
    props: { multiple: z.boolean().optional() },
    children: true,
  }),
  AccordionItem: define({
    description: '單一折疊項',
    props: { title: z.string(), open: z.boolean().optional() },
    children: true,
    translatableProps: ['title'],
  }),
  Tabs: define({
    description: '分頁容器，子元素為 Tab',
    props: { defaultIndex: z.number().int().min(0).optional() },
    children: true,
  }),
  Tab: define({
    description: '單一分頁',
    props: { label: z.string() },
    children: true,
    translatableProps: ['label'],
  }),
  Carousel: define({
    description: '輪播容器，子元素為 Slide',
    props: { loop: z.boolean().optional() },
    children: true,
  }),
  Slide: define({
    description: '單張輪播內容',
    props: {},
    children: true,
  }),
  Progress: define({
    description: '進度條',
    props: {
      value: z.number().min(0).max(100),
      label: z.string().optional(),
      color: color.optional(),
      showValue: z.boolean().optional(),
    },
    children: false,
    translatableProps: ['label'],
  }),
  Benchmark: define({
    description: '效能比較長條圖，子元素為 BenchmarkItem',
    props: {
      lowerIsBetter: z.boolean().optional(),
      unit: z.string().optional(),
    },
    children: true,
  }),
  BenchmarkItem: define({
    description: '單一比較項',
    props: {
      label: z.string(),
      value: z.number(),
      unit: z.string().optional(),
      color: color.optional(),
      highlight: z.boolean().optional(),
    },
    children: false,
    translatableProps: ['label'],
  }),
  CustomQuote: define({
    description: '引言',
    props: {
      author: z.string().optional(),
      variant: z.enum(['default', 'warning', 'info', 'success']).optional(),
    },
    children: true,
  }),
  Playground: define({
    description:
      '可執行的程式碼示範，在隔離的 sandbox iframe 中執行（文章本體不執行程式）。' +
      '子元素只能是 code fence，語言為 html / css / js / jsx，meta 第一個字是檔名（例如 ```jsx App.jsx），' +
      '加上 hidden 則不顯示分頁但仍參與執行。' +
      'react：入口 App.jsx（export default 元件），可 import react 與其他 npm 套件（經 esm.sh）及 ./其他檔案；' +
      'html / vanilla：html、css、js 組成單一頁面（js 以 ES module 執行）。',
    props: {
      template: z.enum(PLAYGROUND_TEMPLATES),
      title: z.string().optional(),
      /** 預覽區高度（px），預設 320 */
      height: z.number().int().min(80).max(1200).optional(),
      /** 進入畫面後自動執行；預設需按「執行」 */
      autoRun: z.boolean().optional(),
    },
    children: true,
    translatableProps: ['title'],
  }),
  PlaygroundFile: define({
    description:
      '由編譯器從 <Playground> 內的 code fence 產生（請勿直接撰寫）；子節點為單一文字節點＝原始碼',
    props: {
      name: z.string().min(1),
      lang: z.enum(PLAYGROUND_LANGS),
      hidden: z.boolean().optional(),
    },
    children: true,
  }),
  Count: define({
    description: '計數器示範元件',
    props: {},
    children: false,
  }),
} satisfies Record<string, ComponentSpec>

export type MdxComponentName = keyof typeof componentRegistry

export const isRegisteredComponent = (
  name: string
): name is MdxComponentName => Object.hasOwn(componentRegistry, name)

/**
 * 允許在 MDX 中直接使用的小寫 HTML 標籤。
 * 不在清單內的（script / style / form 等）→ 編譯錯誤。
 */
export const allowedHtmlTags = new Set([
  'a', 'abbr', 'b', 'blockquote', 'br', 'caption', 'cite', 'code', 'col',
  'colgroup', 'dd', 'del', 'details', 'dfn', 'div', 'dl', 'dt', 'em',
  'figcaption', 'figure', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i',
  'iframe', 'img', 'ins', 'kbd', 'li', 'mark', 'ol', 'p', 'picture', 'pre',
  'q', 'rp', 'rt', 'ruby', 's', 'samp', 'small', 'source', 'span', 'strong',
  'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead',
  'time', 'tr', 'u', 'ul', 'var', 'video', 'audio', 'track', 'center', 'font',
])

/** 匯出整份登記表的 JSON Schema，作為 Web / React Native / Kotlin 各端的共同規格。 */
export function getRegistryJsonSchema() {
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'sao-blog MDX component registry',
    components: Object.fromEntries(
      Object.entries(componentRegistry).map(([name, spec]) => [
        name,
        {
          description: spec.description,
          children: spec.children,
          translatableProps: spec.translatableProps,
          props: z.toJSONSchema(spec.props),
        },
      ])
    ),
  }
}
