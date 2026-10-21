// 工具列「插入元件」選單：對應 packages/mdx/src/registry.ts 登記的區塊元件。
// $0 是插入後的游標位置；有選取文字時 $0 會被選取文字取代。

export interface Snippet {
  label: string
  description: string
  body: string
  /** 行內元件：原地插入，不前後補空行 */
  inline?: boolean
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
    label: 'Accordion 問答（FAQ）',
    description: '每項標上「問／答」印章',
    body: '<Accordion variant="faq">\n  <AccordionItem title="$0問題一？">\n  答案。\n  </AccordionItem>\n  <AccordionItem title="問題二？">\n  答案。\n  </AccordionItem>\n</Accordion>',
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
  {
    label: 'Steps 步驟',
    description: '教學文的第 1 步、第 2 步',
    body: '<Steps>\n  <Step title="$0第一步">\n  </Step>\n  <Step title="第二步">\n  </Step>\n</Steps>',
  },
  {
    label: 'FileTree 檔案樹',
    description: '巢狀清單；資料夾以 / 結尾，**粗體** 標重點',
    body: '<FileTree>\n- src/\n  - **$0index.ts** 進入點\n- package.json\n</FileTree>',
  },
  {
    label: 'LinkCard 連結卡片',
    description: 'GitHub repo、推文網址會自動換成專屬卡片',
    body: '<LinkCard href="$0" />',
  },
  {
    label: 'Tweet 推文',
    description: '推文網址 /status/ 後面的數字',
    body: '<Tweet id="$0" />',
  },
  {
    label: 'Terminal 終端機',
    description: '$ 開頭是指令；animate 逐行打字',
    body: '<Terminal title="zsh">\n\n```bash\n$ $0\n```\n\n</Terminal>',
  },
  {
    label: 'StickyNote 便條紙',
    description: 'yellow / pink / blue / green',
    body: '<StickyNote title="">\n$0\n</StickyNote>',
  },
  {
    label: 'ImageCompare 前後對比',
    description: '拖動分隔線比較兩張圖',
    body: '<ImageCompare before="$0" after="" alt="" />',
  },
  {
    label: 'Embed 影片',
    description: 'YouTube / Bilibili，點了才載入',
    body: '<Embed src="$0" />',
  },
  {
    label: 'Mark 手繪標記（行內）',
    inline: true,
    description: 'highlight / underline / strike / circle / box',
    body: '<Mark>$0</Mark>',
  },
  {
    label: 'Sidenote 旁註（行內）',
    inline: true,
    description: '桌機顯示在段落右側',
    body: '<Sidenote>$0</Sidenote>',
  },
  {
    label: 'Kbd 按鍵（行內）',
    inline: true,
    description: '例如 Ctrl + K',
    body: '<Kbd>$0</Kbd>',
  },
  {
    label: 'Ruby 注音（行內）',
    inline: true,
    description: '振假名／注音',
    body: '<Ruby rt="">$0</Ruby>',
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
