// 工具列「插入元件」選單：對應 packages/mdx/src/registry.ts 登記的區塊元件。
// $0 是插入後的游標位置；有選取文字時 $0 會被選取文字取代。

export interface Snippet {
  label: string
  description: string
  body: string
}

export const COMPONENT_SNIPPETS: Snippet[] = [
  {
    label: 'Alert 提示框',
    description: 'note / info / success / warning / danger',
    body: '<Alert type="info" title="提示">\n$0\n</Alert>',
  },
  {
    label: 'CustomQuote 引言',
    description: '帶作者的引言',
    body: '<CustomQuote author="">\n$0\n</CustomQuote>',
  },
  {
    label: 'Accordion 折疊面板',
    description: '可展開收合的段落',
    body: '<Accordion>\n  <AccordionItem title="標題">\n    $0\n  </AccordionItem>\n</Accordion>',
  },
  {
    label: 'Tabs 分頁',
    description: '多個分頁切換',
    body: '<Tabs>\n  <Tab label="分頁一">\n    $0\n  </Tab>\n  <Tab label="分頁二">\n  </Tab>\n</Tabs>',
  },
  {
    label: 'Carousel 輪播',
    description: '圖片 / 內容輪播',
    body: '<Carousel loop>\n  <Slide>\n    $0\n  </Slide>\n  <Slide>\n  </Slide>\n</Carousel>',
  },
  {
    label: 'Progress 進度條',
    description: '0–100 的進度',
    body: '<Progress value={60} label="$0" showValue />',
  },
  {
    label: 'Benchmark 效能比較',
    description: '長條圖比較',
    body: '<Benchmark unit="ms" lowerIsBetter>\n  <BenchmarkItem label="$0A" value={120} />\n  <BenchmarkItem label="B" value={80} highlight />\n</Benchmark>',
  },
  {
    label: 'Excalidraw 手繪圖',
    description: '貼上 excalidraw.com 分享連結也會自動轉換',
    body: '<Excalidraw src="$0" caption="" />',
  },
  {
    label: 'Playground 程式示範',
    description: '可執行的 React / HTML 範例',
    body: '<Playground template="react" title="範例">\n\n```jsx App.jsx\nexport default function App() {\n  return <h1>$0Hello</h1>\n}\n```\n\n</Playground>',
  },
]

export const DIAGRAM_SNIPPETS: Snippet[] = [
  {
    label: 'Mermaid 流程圖',
    description: '```mermaid 圍欄',
    body: '```mermaid\nflowchart LR\n  A[$0開始] --> B[結束]\n```',
  },
  {
    label: 'ECharts 圖表',
    description: '```echarts 圍欄（JSON option）',
    body: '```echarts\n{\n  "xAxis": { "type": "category", "data": ["一", "二", "三"] },\n  "yAxis": { "type": "value" },\n  "series": [{ "type": "bar", "data": [$03, 5, 2] }]\n}\n```',
  },
  {
    label: '數學公式',
    description: '$$ 區塊公式（KaTeX）',
    body: '$$\n$0\n$$',
  },
]

export const CODE_LANGUAGES = ['ts', 'tsx', 'js', 'jsx', 'bash', 'json', 'css', 'html', 'python', 'go', 'rust', 'sql', 'diff'] as const
