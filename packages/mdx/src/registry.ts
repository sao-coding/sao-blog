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
 * ⚠️ 互動元件擴充方向尚未決定，這份表只收錄既有元件，不新增元件。
 */

const color = z.enum(['blue', 'green', 'amber', 'red', 'purple', 'pink'])

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
