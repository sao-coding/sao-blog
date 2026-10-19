# 文章 / 日記多語言 + 發布時預編譯 — 改動計畫

> 狀態：實作中（PR1 編譯管線已完成，見 §8）・日期：2026-10-19
>
> ⚠️ **前台目標改為 `apps/tan-blog`（`tanstack` 分支）**，下文提到 `apps/mdx-blog` 的前台部分一律改讀 tan-blog。
> tan-blog 已有 Paraglide 與 URL 前綴路由（`zh-Hant` / `en` / `ja`），§5 第 1 點大部分已存在；
> 語系代碼已定案（2026-10-19）：**DB 用 `zh-TW`**（`SUPPORTED_LOCALES` 在 `packages/db/src/schema/index.ts`）；tan-blog 的 Paraglide 維持 `zh-Hant`，在 PR5 以對照表 `zh-Hant ↔ zh-TW` 轉換。
> 背景討論結論：維持 **MDX 為原始格式**（不換 WYSIWYG/Lexical），渲染改為**發布時預編譯**，並加入**多語言**。

## 0. 已確認的決策

| 項目 | 決定 |
|---|---|
| 原始格式 | MDX 字串（匯出、AI 發文、git 友善） |
| slug | 各語言**共用**同一 slug，URL 以 locale 區分 |
| 分類 categories | **要**翻譯（name / description） |
| 標籤 tags | 不翻譯 |
| 留言 | 不分語言，仍掛在 `postId` / `noteId` |
| Notes | **要**多語言 |
| Topics、Thinkings | 本次不處理（之後可比照） |
| 支援語系 | `zh-TW`（預設 / 原文）、`en`、`ja` — 以 Paraglide 設定為單一來源 |
| i18n 框架 | **Paraglide JS**（與 tan-blog 一致） |
| 編譯產物 | **hast JSON**（§3 方案 A），作為 Web / 未來 Android App 共用的跨平台渲染契約 |
| 搜尋引擎 | **Typesense**（§6.5） |
| 互動元件擴充方向 | registry 資料驅動元件 + **Sandbox 元件**執行一次性示範（§3.2） |
| 優先順序 | AI 自動發文 > i18n > 元件互動多樣性；App 非近期重點但保留契約（§3.1） |

## 1. 現況（相關檔案）

- Schema：`packages/db/src/schema/index.ts`
  - `posts`：`title`、`summary`、`content`（MDX）直接在主表
  - `notes`：`title`、`mood`、`weather`、`location`、`content` 在主表
  - `categories`：`name`（unique）、`description`
- Migrations：`packages/db/src/migrations/0000~0002`（drizzle-kit）
- API（oRPC）：`packages/api/src/routers/`
  - 前台：`post.ts`、`note.ts`、`home.ts`、`menu.ts`、`timeline.ts`、`topic.ts`
  - 後台：`admin/post.ts`（createPost/updatePost，含 `mdxToExcerpt` 產生摘要）、`admin/note.ts`、`admin/category.ts`、`admin/dashboard.ts`
  - `packages/api/src/lib/mdx-to-text.ts`
- MCP：`apps/server/src/mcp.ts`（admin_post_* / admin_note_* 工具）
- 前台渲染（**目前每次請求 runtime evaluate**）：
  - `apps/mdx-blog/src/app/(blog)/posts/[slug]/page.tsx`
  - `apps/mdx-blog/src/app/(blog)/notes/[id]/page.tsx`、`notes/_lib/evaluate-note.ts`
  - `apps/mdx-blog/src/components/mdx/{index,mdx-renderer,parsers}.tsx`
  - 預覽：`apps/mdx-blog/src/components/preview/*`
- 後台編輯器：`apps/admin/src/components/posts/post-editor.tsx`、`notes/note-editor.tsx`、`routes/{posts,notes,categories}/index.tsx`
  - ⚠️ `routeTree.gen.ts` 為自動產生，勿手改，只新增 route 檔
- mdx-blog 目前**沒有 locale 路由**（無 i18n 框架）

## 2. Schema 設計

### 2.1 共用

```ts
// packages/db/src/schema/index.ts
export const SUPPORTED_LOCALES = ['zh-TW', 'en', 'ja'] as const
export const localeEnum = pgEnum('locale', SUPPORTED_LOCALES)
export const translationSourceEnum = pgEnum('translation_source', ['human', 'ai'])
```

（`SUPPORTED_LOCALES` 也從 `packages/shared-types` 或 `packages/config` 匯出給前後台共用。）

### 2.2 posts → posts + post_translations

`posts` 保留語言無關欄位，**移除** `title`、`summary`、`content`，新增 `defaultLocale`：

```ts
posts {
  id, slug (unique), authorId, categoryId, cover, status,
  viewCount, likeCount, commentCount, copyright, pin, pinOrder, allowComments,
  defaultLocale: localeEnum.notNull().default('zh-TW'),
  createdAt, updatedAt
}

post_translations {
  id: uuid pk (uuidv7)
  postId: uuid → posts.id (onDelete cascade)
  locale: localeEnum
  title: varchar(512) notNull
  summary: text
  content: text notNull            // MDX 原文（source of truth）
  compiled: jsonb                  // 發布時編譯結果（見 §3）
  toc: jsonb                       // TocItem[]
  plainText: text                  // 搜尋 / RSS / AI 用
  readingTime: integer             // 分鐘或字數，依現有前台需求
  status: postStatusEnum default 'draft'  // 每語言獨立發布
  isSource: boolean default false  // 是否為原文
  translatedBy: translationSourceEnum default 'human'
  sourceHash: varchar(64)          // 翻譯時原文 content 的 sha256；原文為自身 hash
  compiledHash: varchar(64)        // compiled 對應的 content hash（判斷是否需重編）
  createdAt, updatedAt
  unique(postId, locale)
  index(locale, status)
}
```

> 決策點：`posts.status` 保留為「整篇是否上架」總開關，`post_translations.status` 為該語言版本是否發布。前台可見條件 = 兩者皆 published。

### 2.3 notes → notes + note_translations

`notes` 移除 `title`、`content`；`mood`/`weather`/`location` 為**可翻譯文字**，一併移入 translation（若想保持為選項值不翻，可留主表——實作時確認現有資料是自由文字還是固定選項）。

```ts
note_translations {
  id, noteId → notes.id (cascade), locale,
  title, content, compiled, toc, plainText,
  mood, weather, location,          // 視上述確認結果
  status: boolean default false,
  isSource, translatedBy, sourceHash, compiledHash,
  createdAt, updatedAt
  unique(noteId, locale)
}
notes 新增 defaultLocale
```

### 2.4 categories → categories + category_translations

```ts
category_translations {
  id, categoryId → categories.id (cascade), locale,
  name: varchar(100) notNull,
  description: text,
  unique(categoryId, locale)
}
```

`categories.name` 保留為原文名（後台顯示、unique 檢查），或改為只存 slug——建議**保留**以降低改動面，前台改讀 translation、fallback 到 `categories.name`。

### 2.5 Relations

為 drizzle relational query 補上 `postsRelations.translations`、`notesRelations.translations`、`categoriesRelations.translations`。

## 3. 發布時預編譯

新增共用模組 `packages/mdx`（或放在 `packages/api/src/lib/mdx/`，若前後台都要用則建議獨立 package）：

```ts
compileMdx(source: string): Promise<
  | { ok: true; compiled: HastRoot | string; toc: TocItem[]; plainText: string; readingTime: number; hash: string }
  | { ok: false; errors: { line?: number; column?: number; message: string }[] }
>
```

- remark/rehype plugin 鏈從 `apps/mdx-blog/src/components/mdx/parsers.ts` **抽出共用**，避免兩份設定漂移
- 產出格式二選一（實作第一步先做 spike 決定）：
  - **A. hast JSON** → 前台用 `hast-util-to-jsx-runtime` + 元件對照表渲染（不執行任意 JS，最安全）。限制：MDX 內不能用 JS 表達式；元件 props 須為純資料
  - **B. 編譯後 JS 字串**（`compile` with `outputFormat: 'function-body'`）→ 前台 `run()`。彈性高，但仍執行程式碼
  - 建議 **A**；先盤點現有文章是否有 `{expression}` / `export` 用法，有的話列清單改寫
- **元件 registry**（`components/mdx/registry`）：每個元件宣告
  - `component`（渲染）
  - `allowedProps`（編譯時驗證白名單，未知元件 / prop → 編譯錯誤）
  - `translatableProps`（給 AI 翻譯用，例如 Tabs 的 label、Alert 的 title）
  - `toText(node)`（產 plainText / 摘要）
- 寫入路徑：create/update translation 時呼叫 `compileMdx`；失敗回傳 `{ status: 'error', errors }`，**不存檔**（AI 可依錯誤自行修正）
- 讀取路徑：`compiledHash !== hash(content)` 或 `compiled` 為空 → lazy 重編並回寫（相容舊資料 / plugin 升版）
- 加一個 admin 端點 `recompileAll`，plugin 鏈改版時批次重編
- 編譯成功後觸發搜尋索引同步（§6.5）

### 3.1 跨平台渲染契約（為未來 Android App 預留）

MDX 原文需 JS 執行環境，App 無法直接使用；但 hast JSON 是純資料，任何平台皆可走訪渲染。因此：

- **確定採用方案 A（hast JSON）**，不採方案 B（App 端將需要 JS 引擎）
- 元件 props **只允許純資料**（string / number / boolean / 陣列 / 物件），禁止函式與 JS 表達式；編譯時驗證
- 元件 registry 的 props 定義用 **zod**，並可匯出 **JSON Schema**（`registry.schema.json`），作為 Web / React Native / Kotlin 各端實作的共同規格
- hast JSON 結構加上版本號（`compiled: { v: 1, tree: HastRoot }`），結構變更時遞增，客戶端可判斷相容性
- 渲染端遇到**未知元件**必須降級顯示（fallback 區塊 + 「於網頁查看」連結），不得崩潰；Web renderer 同樣實作此行為
- 公開 API 回傳 `compiled` + `toc`，App 端不做任何 MDX 處理

> **優先順序（2026-10-19 定案）**：AI 自動發文 > i18n > 元件互動多樣性；Android App 不是近期重點，但**上述契約全部保留**，不得為了 Web 方便而破壞（App 後路）。
> JSON Schema 除了當 App 規格，同時也是給 AI（MCP 工具描述）的元件說明。

### 3.2 互動元件擴充方向（2026-10-19 定案）

- **資料驅動元件**：互動行為寫在各端元件實作裡，MDX 只傳純資料 props。新增元件 = registry 登記 zod schema + Web 實作（`satisfies` 檢查），AI 透過 JSON Schema 自動得知可用元件
- **一次性示範 / 可執行程式碼 → Sandbox 元件**：不允許在文章裡 `export` 元件或寫 JS 表達式；需要執行的程式碼一律以**資料**形式（子元素 code fence 或字串 prop）交給 sandbox 元件，在 `sandbox` iframe（或 Sandpack）中執行，與部落格本體的 DOM / cookie 隔離
  ````mdx
  <Playground template="react">
  ```jsx App.jsx
  export default function App() { … }
  ```
  </Playground>
  ````
  - 編譯管線需讓 sandbox 元件內的 code fence 保留原始碼（不經 Shiki 高亮，或另存原文）
  - App 端可先降級為「顯示程式碼 + 於網頁執行」連結，維持契約
- 文章本體永遠不執行程式；「會執行的程式」被明確限縮在 sandbox 內 —— 這同時是 AI 發文的安全邊界

## 4. API 變更（packages/api）

### 4.1 後台

- `admin/post.ts`
  - `createPost`：建立 `posts` + 一筆 `isSource=true` 的 `post_translations`（locale = `defaultLocale`）
  - `updatePost`：只更新語言無關欄位；內容改走下方 translation 端點（或接受 `locale` 參數一併 upsert）
  - 新增 `getPostTranslations(postId)`、`upsertPostTranslation({ postId, locale, title, summary, content, status, translatedBy })`、`deletePostTranslation({ postId, locale })`（不可刪 source）
  - upsert 非 source 語言時，自動寫入 `sourceHash = 原文目前 hash`
  - `getPosts` 列表回傳每篇的語言狀態：`{ locale, status, outdated: sourceHash !== 原文 hash }[]`
  - `summary` 未填 → 用 compile 產出的 plainText 截斷（取代現在的 `mdxToExcerpt`）
- `admin/note.ts`：同上（`upsertNoteTranslation` 等）
- `admin/category.ts`：create/update 接受 `translations: { locale, name, description }[]`
- `admin/dashboard.ts`：改讀 source translation 的 title
- 新增 `previewMdx({ content })` → 回傳 compile 結果或錯誤（給 MCP / AI 發文前驗證）

### 4.2 前台

- `post.ts`、`note.ts`、`home.ts`、`menu.ts`、`timeline.ts`、`topic.ts`：所有 procedure 加 `locale` input（預設 `zh-TW`）
- 查詢：join translation where `locale = 請求語系`，找不到 → fallback `defaultLocale`，回傳 `{ ...data, locale: 實際語系, isFallback: boolean, availableLocales: Locale[] }`
- 文章頁回傳 `compiled`、`toc`，**不再回傳需前端 evaluate 的原始 MDX**（仍可額外提供 raw 給「查看原文」）
- category 名稱同樣 fallback

### 4.3 MCP（apps/server/src/mcp.ts）

- 新增工具：`admin_post_upsertTranslation`、`admin_post_getTranslations`、`admin_note_upsertTranslation`、`admin_note_getTranslations`、`admin_content_previewMdx`
- 工具描述中寫明：可翻譯 props 清單（從 registry 產生）、`translatedBy: 'ai'`
- 同步更新 skill `mdx-post-components` 說明多語言流程

## 5. 前台（apps/mdx-blog）

1. **i18n 路由**：引入 locale segment
   - 使用 **Paraglide JS**（`@inlang/paraglide-js`，與 tan-blog 一致）：`project.inlang/settings.json` 設定 `baseLocale: "zh-TW"`、`locales: ["zh-TW","en","ja"]`；用 Paraglide 的 Next.js 整合（`paraglideMiddleware` + URL strategy）處理 locale 偵測與導向，`app/[locale]/(blog)/...` 或 rewrite 皆可，依 Paraglide 版本的官方 Next.js 範例決定。預設語系**省略前綴**（`/posts/x` = zh-TW），保持現有網址不變
   - `SUPPORTED_LOCALES`（DB enum）與 Paraglide 的 `locales` 必須一致：以 Paraglide 產生的 `locales` / `Locale` 型別為準，DB 常數與 API zod schema 從同一份設定產生或加型別檢查斷言。UI 字串用 `messages/{locale}.json` + `m.xxx()`；內容（文章）翻譯走 DB，不放進 messages
2. **渲染**：`posts/[slug]/page.tsx`、`notes/[id]/page.tsx` 改為 `renderCompiled(compiled, registry)`；移除 `evaluate-note.ts` 的 runtime evaluate
3. **SEO**：`generateMetadata` 輸出 `alternates.languages`（hreflang）、`<html lang>`；sitemap 列出各語言版本
4. **UI**：文章頁語言切換器（只列 `availableLocales`）、`isFallback` 時顯示「本文尚無此語言版本」提示；AI 翻譯版本可顯示小標記
5. **預覽**（`components/preview/*`）：改用 `compileMdx` 同一套管線

## 6. 後台（apps/admin）

- `post-editor.tsx` / `note-editor.tsx`：
  - 頂部語言 tabs（zh-TW / en / ja），每個 tab 編輯該 translation 的 title / summary / content / status
  - 非原文 tab 顯示「原文已更新，譯文過期」提示（`outdated`）
  - 可選：並排模式（左原文、右譯文）
  - 即時預覽：Web Worker 內編譯 + 同一份 registry 渲染；錯誤標在編輯器對應行（可後續任務）
- `posts-columns.tsx` / `notes-columns.tsx`：新增語言狀態欄（小 badge，過期以警示色）
- 分類表單：各語言 name / description 欄位
- 只新增 route 檔，**不要手改 `routeTree.gen.ts`**

## 6.5 搜尋（Typesense）

目前 repo 沒有任何全文搜尋實作。

### 基礎設施

- `packages/db/docker-compose.yml` 新增 `typesense` service（`typesense/typesense:<固定版本>`，port 8108，volume 持久化，healthcheck `/health`）
- `packages/env`：
  - server：`TYPESENSE_HOST`、`TYPESENSE_PORT`、`TYPESENSE_PROTOCOL`、`TYPESENSE_ADMIN_API_KEY`
  - web（前台）：`NEXT_PUBLIC_TYPESENSE_HOST`… + `NEXT_PUBLIC_TYPESENSE_SEARCH_KEY`
- **Search-only key**：用 admin key 產生 scoped search key（`filter_by: status:=published`，只允許 `documents:search`），前台只能拿到這把；admin key 絕不進 client bundle
- 新增 `packages/search`（或 `packages/api/src/lib/search/`）：Typesense client、collection schema、索引函式

### Collection 設計

單一 collection `contents`，**一筆文件 = 一篇內容的一個語言版本**：

```ts
{
  id: `${type}:${refId}:${locale}`,   // 例 post:<uuid>:en
  type: 'post' | 'note',               // facet
  refId: string,
  locale: 'zh-TW' | 'en' | 'ja',       // facet，查詢時 filter_by locale
  slug: string,                        // post 用；note 用 id
  title: string,
  summary: string,
  content: string,                     // compileMdx 產出的 plainText
  headings: string[],                  // 由 toc 取得，加權搜尋
  categoryId?: string, categoryName?: string,   // facet（當語系分類名）
  tags?: string[],                     // facet（tags 不翻譯）
  topicId?: string,                    // note
  cover?: string,
  status: 'published',                 // 只索引已發布者
  isFallback: false,
  createdAt: int64, updatedAt: int64   // 排序
}
```

- **分詞**：中、日文需 Typesense 的 CJK 支援 —— 欄位設 `locale` 對應 `"locale": "zh"` / `"ja"`（Typesense 欄位層級 locale 設定）；因同一欄位要混語系，建議改為**每語系獨立欄位**（`title_zh`、`title_en`、`title_ja`…）或**每語系一個 collection**（`contents_zh-TW`、`contents_en`、`contents_ja`）。實作時以 Typesense 目前版本文件確認 CJK 分詞方式後擇一，**預設採每語系一個 collection**（schema 最單純、可各自設定 locale）
- `query_by`: `title,headings,summary,content`，權重 `4,3,2,1`
- 高亮：`highlight_fields: content`，搭配 `snippet_threshold`

### 同步策略

- **寫入時同步（主要）**：`upsertPostTranslation` / `upsertNoteTranslation` / 狀態變更 / 刪除後，呼叫 `indexContent(type, refId, locale)`：
  - 已發布（主表與 translation 皆 published）→ upsert 文件
  - 否則 → 刪除該文件
  - 分類改名 → 重新索引該分類下文件
  - 同步失敗只記 log、不阻擋存檔；寫入 `search_sync_failures`（或簡單用 log + 下方全量重建修補）
- **全量重建**：admin 端點 `reindexAll`（建立新 collection → 寫入 → 切換 alias → 刪舊），用 Typesense **collection alias** 達成零停機；schema 變更時使用
- 未翻譯語系**不建立 fallback 文件**（避免搜尋結果重複）；前台搜尋 `/en` 時只搜 en，可提供「搜尋所有語言」選項

### API / 前台 / 後台

- 前台搜尋可二選一：
  - **直接從瀏覽器打 Typesense**（scoped search key，延遲最低，可用 `typesense-instantsearch-adapter` 或自寫）
  - 或經 `packages/api` 新增 `search.query({ q, locale, type?, page })` proxy（方便加 rate limit、統一回傳格式，App 也能共用）
  - 建議：**提供 API proxy 作為正式介面**（App / MCP 共用），前台 ⌘K 搜尋框可直接打 Typesense 以求即時
- 前台 UI：header 加搜尋入口 + ⌘K command palette（`packages/ui` 已有 `command.tsx`），結果顯示標題、類型、高亮片段，點擊導向 locale 對應網址
- MCP：新增 `content_search` 工具（AI 發文前可查相關舊文、做內部連結）
- 後台：設定頁或 dashboard 加「重建索引」按鈕與索引狀態（文件數、最後同步時間）

## 7. 資料遷移

單一 drizzle migration（`pnpm --filter db db:generate` 後手動補 data migration SQL）：

1. 建 enum、三張 translation 表
2. `posts.default_locale` = 'zh-TW'
3. `INSERT INTO post_translations (post_id, locale, title, summary, content, status, is_source, translated_by) SELECT id, 'zh-TW', title, summary, content, status, true, 'human' FROM posts`
4. notes、categories 同理
5. **先不 drop 舊欄位**：PR2 期間舊欄位維持 notNull 並**雙寫**（主表仍是讀取來源，每次存檔同步 upsert 原文 translation）；PR3 改讀 translation、停止寫入舊欄位時再改為 nullable；確認上線無誤後，下一個 migration 再 drop
6. 部署後跑 `recompileAll` 產生 `compiled` / `toc` / `plainText`（或靠 lazy 重編）
7. 遷移前備份資料庫

## 8. 實作順序（建議切 PR）

1. **PR1 – 編譯管線**：抽出 `compileMdx` + registry + 盤點/改寫不相容文章；前台改渲染 compiled（仍讀舊欄位，先加 `compiled` 暫存欄位或記憶體快取）— 可獨立驗證效能
   - ✅ 已完成：新 package `packages/mdx`（`compileMdx`、zod registry、`registry.schema.json`、`scripts/audit.ts`）；tan-blog 的 `lib/mdx/compile-source.ts` 改用它產出 hast JSON，文章 / 日記 / 預覽改由 `<CompiledMdx>`（`lib/mdx/compiled-mdx.tsx`）渲染，取代原本的 function-body + `runSync`；快取沿用既有 Nitro ISR（`lib/isr/*`）；移除 `components/mdx/parsers.ts`、`lib/mdx/mdx-content.tsx`
   - 盤點結果（2026-10-19，正式站已發布內容）：14 篇文章、19 篇日記**全數通過**，無需改寫。草稿未盤點
   - 未清：tan-blog 的 `@mdx-js/mdx`、`gray-matter`、remark/rehype/shiki 依賴已不再使用，留到 PR7 一併移除
1.5 **PR1.5 – AI 發文驗證**（因優先順序調整，自 PR3 提前）：API 新增 `previewMdx`；`createPost` / `updatePost` / `createNote` / `updateNote` 存檔前以 `compileMdx` 驗證，失敗回傳帶行號的錯誤、不存檔；未填摘要改用 compile 產出的 plainText；MCP 新增 `admin_content_previewMdx`，工具描述附上 registry 元件規格
   - ✅ 已完成：`packages/api/src/lib/mdx-validate.ts`（`checkMdxForSave`）；發布時錯誤拒存、**草稿仍可存但回傳警告**（避免後台半成品存不了）；新增 `admin/content` router → MCP `admin_content_previewMdx`、`admin_content_getComponents`（回傳 registry JSON Schema）；post / note 建立與更新的 route summary 寫明驗證規則，AI 從工具描述即可得知
2. **PR2 – Schema + 資料遷移**：translation 表、relations、data migration（舊欄位保留）
   - ✅ 已完成：migration `0003_content_translations`（enum `locale` / `translation_source`、三張 translation 表、`posts` / `notes.default_locale`、回填既有內容為 zh-TW 原文，`source_hash` 以 SQL 計算且與 `hashSource` 一致）；後台 post / note / category 存檔**雙寫**原文 translation（含 compiled / toc / plainText）；以 PGlite 實測遷移與雙寫
   - 決定：notes 的 `mood` / `weather` 是固定選項值 → 留主表（UI 標籤走 Paraglide）；`location` 暫留主表
   - 部署：`pnpm db:migrate` 前先備份；既有內容的 compiled 為空，PR3 讀取時 lazy 重編或跑 recompileAll
3. **PR3 – API**：後台 / 前台 procedure 改讀寫 translation，locale + fallback；MCP 工具
   - ✅ 已完成：公開 post / note / timeline / home / menu / topic 加 `locale`（預設 zh-TW），請求語系無已發布譯文 → 原文，回傳 `locale` / `isFallback` / `availableLocales` / `translatedBy`；分類名稱同樣 fallback（`packages/api/src/lib/i18n.ts`）
   - `getPost` / `getNote` 附 `compiled` / `toc` / `readingTime`，compiled 為空或 `compiledHash` 不符時 lazy 重編並回寫
   - 後台 / MCP：`admin_post_{get,upsert,delete}PostTranslation(s)`、日記同理、`admin_category_{get,upsert}CategoryTranslation(s)`（`routers/admin/translation.ts`）；不可改 / 刪原文；後台列表附各語言 `outdated` 狀態
   - 與原計畫不同：舊欄位**仍雙寫、未改 nullable**（主表保留原文副本，作為沒有 translation 時的 fallback），改到 PR7 一併處理
   - `CompiledContent.tree` 改為自訂 `HastJsonRoot`（hast 的純 JSON 子集），避免 @types/hast 的 `data` 擴充讓跨端序列化型別失效
4. **PR4 – 後台 UI**：語言 tabs、狀態 badge、分類翻譯表單
   - ✅ 已完成（`apps/admin/src/components/translations/`）：文章 / 日記編輯器頂部語言分頁（原文 + 其他語系，圓點顯示已發布 / 草稿 / 過期 / 未建立）；譯文編輯區可並排顯示唯讀原文、AI 翻譯勾選、過期警示、儲存草稿 / 發佈 / 刪除譯文
   - 列表新增「語言」欄 badge；分類表單加入 English / 日本語 名稱與描述
   - 修正：編輯器原本不檢查 `status: "error"`，發布時 MDX 錯誤也顯示成功 → 改為顯示後端錯誤（含行號），草稿警告以 warning toast 顯示
   - 未驗證畫面：本機 DB 尚未套用 migration 0003，後台無法載入列表
5. **PR5 – 前台 i18n 路由 + SEO**：locale segment、Paraglide 設定與 middleware、hreflang、語言切換、fallback 提示
   - ✅ 已完成（tan-blog，先於 PR4 進行：AI 以 MCP 管理譯文，後台 UI 較不急）：`lib/content-locale.ts` 對照 `zh-Hant ↔ zh-TW`；所有 API 呼叫與 query key 帶 `locale`（loader 算好再傳入 server fn，因 server fn 的 RPC 網址沒有語系前綴）
   - Nitro ISR 快取 key 改為「語系:slug」，`/api/revalidate` 一次清掉所有語系
   - 文章 / 日記頁直接使用 API 的 `compiled`（`resolveCompiled`，沒有時才本地編譯）；`CompiledContent` 加入 frontmatter 純量值（`showToc` 等）
   - `ContentLocaleNotice`：fallback 提示、AI 翻譯標註、其他語言版本連結；`pageHead({ contentLocales })`：hreflang 只列已發布語系，canonical 指向目前語系（有譯文時）或原文，`og:locale` 依語系
   - 以本機測試 API（PGlite + 正式站匯入的 2 篇文章 / 3 則日記 + 測試譯文）驗證 SSR 與 client 導航
   - 未做：sitemap 列出各語言版本、RSS 多語
6. **PR6 – 搜尋**：Typesense docker / env、`packages/search`、collection + alias、寫入時同步、`reindexAll`、搜尋 API proxy、前台 ⌘K、MCP `content_search`（依賴 PR3 的 translation 寫入路徑與 PR1 的 plainText）
7. **PR7 – 清理**：drop 舊欄位、移除 runtime evaluate 相關程式碼
8. （後續）AI 翻譯流程：MCP 一鍵翻譯、mdast 區塊級增量翻譯、後台即時預覽 Worker 化
9. （後續）互動元件擴充：依 §3.2，先做 Sandbox 元件；Android App 渲染端（非近期，契約已保留）

## 9. 驗收

- 既有文章 / 日記網址與內容不變（zh-TW 無前綴）
- `/en/posts/<slug>` 有譯文顯示譯文，無則 fallback 並顯示提示
- 文章頁不再於請求時 evaluate MDX（檢查 server log / bundle 不含 MDX compiler）
- MCP 可建立文章、新增英文翻譯、預覽驗證錯誤
- 修改原文後，後台譯文顯示「過期」
- hreflang 與 sitemap 正確
- `compiled` 帶版本號；registry 可匯出 JSON Schema；未知元件降級顯示不崩潰
- 發布 / 修改 / 下架文章後，Typesense 對應語系文件同步更新或刪除；`reindexAll` 透過 alias 零停機完成
- 中文、日文、英文關鍵字皆能搜到對應語系文章，且只回傳已發布內容；前台 bundle 不含 admin key
- 型別檢查與 build 通過：`pnpm turbo build typecheck`

## 10. 待實作時確認

- ~~現有文章是否用到 MDX JS 表達式 / `export`~~ → 已發布內容皆未使用，hast JSON 方案可行（草稿待確認）
- ~~notes 的 `mood` / `weather` 是自由文字還是固定選項~~ → 固定選項，留主表
- 預設語系 URL 是否省略前綴（本計畫假設省略）
- Typesense 版本的 CJK 分詞設定方式（決定每語系 collection vs 每語系欄位；預設每語系 collection）
- Typesense 部署位置（自架 docker 與 Postgres 同機，或 Typesense Cloud）
- ~~互動元件擴充方向~~ → 已定案（§3.2）；Sandbox 用自製 `sandbox` iframe 或 Sandpack 待實作時決定
