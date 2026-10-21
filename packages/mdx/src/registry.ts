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

/** 圖片等資源：http(s) 網址或站內路徑（/ 開頭），擋掉 javascript: / data: 之類 */
const assetUrl = z
  .string()
  .regex(/^(https?:\/\/|\/(?!\/))/, '只接受 http(s) 網址或以 / 開頭的站內路徑')

/** <Embed> 支援的影片網址：YouTube（watch / shorts / youtu.be）與 Bilibili（BV 號） */
export const EMBED_URL_PATTERN =
  /^https:\/\/(?:(?:www\.|m\.)?youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)[\w-]{11}|youtu\.be\/[\w-]{11}|(?:www\.|m\.)?bilibili\.com\/video\/BV\w{10})/

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
    description:
      '折疊面板容器，子元素為 AccordionItem。variant="faq" 時每項標上「問／答」印章，適合常見問題',
    props: {
      multiple: z.boolean().optional(),
      variant: z.enum(['default', 'faq']).optional(),
    },
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
  Excalidraw: define({
    description:
      'Excalidraw 手繪風圖表。src 為 excalidraw.com 分享連結（#json=ID,KEY）或 .excalidraw（JSON）檔的網址，於瀏覽器端轉成 SVG 顯示；' +
      '深色模式自動反相。適合需要自由排版或手繪質感的圖，結構化的流程圖請用 mermaid。',
    props: {
      src: z.string().url(),
      /** 圖說，顯示在圖下方，同時作為無障礙替代文字 */
      caption: z.string().optional(),
    },
    children: false,
    translatableProps: ['caption'],
  }),
  Steps: define({
    description: '步驟清單容器，子元素為 Step，自動編號（教學文的「第 1 步、第 2 步」）',
    props: {},
    children: true,
  }),
  Step: define({
    description: '單一步驟，需放在 <Steps> 內；內容支援 markdown（含程式碼）',
    props: { title: z.string() },
    children: true,
    translatableProps: ['title'],
  }),
  FileTree: define({
    description:
      '檔案樹。子內容寫成 markdown 巢狀清單：名稱以 / 結尾或底下還有清單的是資料夾；' +
      '用 **粗體** 標示重點檔案；名稱後面接的文字當註解（例如 `- vite.config.ts 建置設定`）',
    props: {},
    children: true,
  }),
  LinkCard: define({
    description: '連結卡片：抓網頁的標題、描述與預覽圖顯示成卡片；title / description 可手動覆寫',
    props: {
      href: z.string().url(),
      title: z.string().optional(),
      description: z.string().optional(),
    },
    children: false,
    translatableProps: ['title', 'description'],
  }),
  Kbd: define({
    description: '鍵盤按鍵（行內），例如 <Kbd>Ctrl</Kbd>+<Kbd>K</Kbd>',
    props: {},
    children: true,
  }),
  Ruby: define({
    description: '注音／振假名（行內），例如 <Ruby rt="かんじ">漢字</Ruby>',
    props: { rt: z.string().min(1) },
    children: true,
  }),
  Terminal: define({
    description:
      '終端機視窗：裡面放一個 code fence。`$ `、`❯ `、`> `、`PS …> ` 開頭的行是指令，其餘是輸出，' +
      '`# ` 開頭是註解；複製只複製指令。animate 時捲到才逐行打出來（點一下跳到結尾）',
    props: {
      title: z.string().optional(),
      animate: z.boolean().optional(),
    },
    children: true,
    translatableProps: ['title'],
  }),
  Tweet: define({
    description:
      '嵌入推文（X / Twitter）：id 是推文網址 /status/ 後面的數字。由伺服器抓取並快取，' +
      '抓不到（刪除、私人帳號）時顯示連結卡片。也可以直接寫 <LinkCard href="https://x.com/…/status/…" />',
    props: { id: z.string().regex(/^\d{1,25}$/, '推文 id 是一串數字') },
    children: false,
  }),
  Mark: define({
    description:
      '手繪標記（行內），捲到時才畫上去：type 為 highlight（螢光筆，預設）/ underline / strike / circle / box；' +
      'circle、box 適合短詞。color 換色，highlight 預設赭黃、其餘預設朱筆',
    props: {
      type: z.enum(['highlight', 'underline', 'strike', 'circle', 'box']).optional(),
      color: color.optional(),
    },
    children: true,
  }),
  Sidenote: define({
    description: '旁註（行內）：寫在句子裡，桌機顯示在段落右側，手機收成可點開的小標記',
    props: {},
    children: true,
  }),
  StickyNote: define({
    description: '便條紙：貼在文章裡的一張便條（文楷、紙膠帶），適合日記與隨筆；color 換紙色',
    props: {
      title: z.string().optional(),
      color: z.enum(['yellow', 'pink', 'blue', 'green']).optional(),
    },
    children: true,
    translatableProps: ['title'],
  }),
  ImageCompare: define({
    description: '前後對比：兩張同尺寸的圖疊在一起，拖動分隔線比較（例如介面改版前後）',
    props: {
      before: assetUrl,
      after: assetUrl,
      beforeLabel: z.string().optional(),
      afterLabel: z.string().optional(),
      /** 圖片的替代文字／圖說 */
      alt: z.string().optional(),
    },
    children: false,
    translatableProps: ['beforeLabel', 'afterLabel', 'alt'],
  }),
  Embed: define({
    description:
      '影片嵌入（YouTube / Bilibili）：先顯示縮圖，點擊才載入播放器（不拖慢頁面、不先送出追蹤請求）',
    props: {
      src: z.string().regex(EMBED_URL_PATTERN, '只支援 YouTube 或 Bilibili 的影片網址'),
      title: z.string().optional(),
    },
    children: false,
    translatableProps: ['title'],
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
