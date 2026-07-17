---
name: mdx-post-components
description: Reference for the JSX block components available when writing apps/mdx-blog article content (Alert, Accordion, Tabs, Carousel, Progress, Benchmark, CustomQuote, mermaid/echarts). Use whenever asked to write, draft, or edit a blog post / article / note body for this project.
---

# mdx-blog 文章區塊元件

`apps/mdx-blog` 用 `next-mdx-remote-client` 渲染文章，文章正文本身就是一段 **MDX 字串**（存在資料庫 `post.content` 欄位裡，沒有 YAML frontmatter — 標題/摘要/封面/標籤/分類另有獨立欄位，見 [post.ts](../../../apps/mdx-blog/src/schemas/post.ts)）。

寫文章內容時只需輸出 MDX 正文本身（markdown + 下列 JSX 標籤），不要加 `---` frontmatter 區塊。

## 核心規則

區塊元件一律用 **JSX 標籤**書寫（`<Alert>...</Alert>`），**不要**用：
- ` ```fence ` 圍欄（除了 `mermaid` / `echarts`，見下方例外）
- `<!-- -->` HTML 註解（會被 MDX 剝除）
- Hexo 的 `{% tag %}` 語法（此專案沒有對應的 remark plugin）

標籤內可以直接放任意巢狀 markdown（粗體、清單、圖片、程式碼區塊…），不需要跳脫。

元件註冊於 [index.tsx](../../../apps/mdx-blog/src/components/mdx/index.tsx)，實作在 [renderers/](../../../apps/mdx-blog/src/components/mdx/renderers/)。

## 元件清單

### Alert（提示框）

```mdx
<Alert type="warning" title="注意">
這裡支援**任意 markdown**內容。
</Alert>
```

- `type`: `note`(預設) / `info` / `success` / `warning` / `danger`
- `title`: 選填，省略則只顯示內文

### Accordion / AccordionItem（折疊面板）

```mdx
<Accordion>
  <AccordionItem title="問題一" open>
  答案內容，支援 **markdown**。
  </AccordionItem>
  <AccordionItem title="問題二">
  另一段答案。
  </AccordionItem>
</Accordion>
```

- `Accordion.multiple`: 是否允許同時展開多項，預設 `false`（單選）
- `AccordionItem.title`: 必填，折疊標題
- `AccordionItem.open`: 選填，預設是否展開

### Tabs / Tab（分頁）

```mdx
<Tabs defaultIndex={0}>
  <Tab label="JavaScript">
  ```js
  console.log('hi')
  ```
  </Tab>
  <Tab label="Python">
  ```python
  print('hi')
  ```
  </Tab>
</Tabs>
```

- `Tabs.defaultIndex`: 預設選中分頁（從 0 起算），預設 `0`
- `Tab.label`: 必填，分頁標籤文字（Tab 之間用 `label` prop 辨識，不是靠元件型別）

### Carousel / Slide（輪播）

```mdx
<Carousel>
  <Slide>![圖一](/img/1.jpg)</Slide>
  <Slide>![圖二](/img/2.jpg)</Slide>
</Carousel>
```

- `Carousel.loop`: 是否循環播放，預設 `true`
- `Slide` 內可放圖片或任意 markdown

### Progress（進度條）

常用於技能熟練度列表。

```mdx
<Progress value={90} label="HTML" color="amber" />
<Progress value={70} label="TypeScript" color="blue" />
```

- `value`: 必填，0–100
- `label`: 選填，左側標籤文字
- `color`: `blue`(預設) / `green` / `amber` / `red` / `purple` / `pink`
- `showValue`: 是否顯示百分比數字，預設 `true`

### Benchmark / BenchmarkItem（效能比較長條圖）

常用於優化前後、多方案速度對比（例如打包工具耗時、優化前後的載入時間）。各長條寬度依「所有項目中的最大值」等比例縮放，不是各自獨立的 0–100%；數值最佳的項目會自動標示閃電圖示。

```mdx
<Benchmark unit="ms">
  <BenchmarkItem label="優化前" value={4200} />
  <BenchmarkItem label="優化後" value={180} />
</Benchmark>
```

多方案對比，且數值越大越好（例如吞吐量）：

```mdx
<Benchmark unit=" req/s" lowerIsBetter={false}>
  <BenchmarkItem label="方案 A" value={1200} />
  <BenchmarkItem label="方案 B" value={3400} />
  <BenchmarkItem label="方案 C" value={2100} />
</Benchmark>
```

- `Benchmark.lowerIsBetter`: 數值越小越好，預設 `true`（例如耗時）；設為 `false` 時數值越大越好（例如吞吐量）
- `Benchmark.unit`: 套用到所有項目的預設單位字串（例如 `"ms"`），`BenchmarkItem` 可用自己的 `unit` 覆寫
- `BenchmarkItem.label`: 選填，左側標籤文字
- `BenchmarkItem.value`: 必填，數字（不是百分比，例如 `4200` 代表 4200ms）
- `BenchmarkItem.unit`: 選填，覆寫該項目的單位
- `BenchmarkItem.color`: 選填，`blue` / `green` / `amber` / `red` / `purple` / `pink`，未設定時由最佳結果自動判斷（最佳為綠色，其餘為藍色）
- `BenchmarkItem.highlight`: 選填，手動標記最佳結果；只要任一 item 設定此 prop，整組就改用手動模式（不再依數值自動判斷）

### CustomQuote（自訂引言）

```mdx
<CustomQuote author="某某人" variant="info">
這是一段引言內容。
</CustomQuote>
```

- `author`: 選填，顯示在引言下方
- `variant`: `default`(預設) / `warning` / `info` / `success`

### Count（互動計數器 demo 元件）

```mdx
<Count />
```

無 props，純示範用的 client 互動元件（點擊按鈕累加數字）。一般文章很少需要用到。

## 例外：mermaid / echarts 仍用 fence

因為內容本身是程式碼/資料，這兩個**不要**改成 JSX 標籤：

````mdx
```mermaid
graph TD
  A --> B
```
````

````mdx
```echarts
{ "title": { "text": "範例圖表" }, "xAxis": {}, "yAxis": {}, "series": [] }
```
````

`echarts` 圍欄內必須是合法 JSON（會被 `JSON.parse`），不是 JS 物件字面量。

## 其他自動處理（不需手動加標籤）

- 一般 markdown 圖片 `![alt](src)` 會自動用 `next/image` 渲染，不需另外包裝。
- 外部連結（`http(s)://` 開頭的 `[text](url)`）會自動套用增強樣式，站內連結維持原生 `<a>`。
- 標題（`#` ~ `######`）會自動加上 `scroll-mt-20`，不需手動處理。

## 常見錯誤

- **元件沒有渲染，直接印出標籤文字**：通常是把子元件（`AccordionItem`/`Tab`/`Slide`/`BenchmarkItem`）放在容器外，或忘記容器包起來。
- **Accordion/Tabs/Benchmark 內容消失**：`AccordionItem` 需要 `title`、`Tab` 需要 `label`、`BenchmarkItem` 需要 `value`，缺少必填 prop 會被過濾掉（`isAccordionItem`/`isTab`/`isBenchmarkItem` 判斷失敗）。
- **echarts 圖表顯示「JSON 格式錯誤」**：圍欄內容不是合法 JSON（例如用了單引號或尾逗號）。
