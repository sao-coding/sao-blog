# 文章 / 日記多語言 + 發布時預編譯 — 改動計畫

> 狀態：計畫（尚未實作）・日期：2026-10-19
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

## 7. 資料遷移

單一 drizzle migration（`pnpm --filter db db:generate` 後手動補 data migration SQL）：

1. 建 enum、三張 translation 表
2. `posts.default_locale` = 'zh-TW'
3. `INSERT INTO post_translations (post_id, locale, title, summary, content, status, is_source, translated_by) SELECT id, 'zh-TW', title, summary, content, status, true, 'human' FROM posts`
4. notes、categories 同理
5. **先不 drop 舊欄位**：第一階段讓舊欄位改為 nullable 並停止寫入；確認上線無誤後，下一個 migration 再 drop
6. 部署後跑 `recompileAll` 產生 `compiled` / `toc` / `plainText`（或靠 lazy 重編）
7. 遷移前備份資料庫

## 8. 實作順序（建議切 PR）

1. **PR1 – 編譯管線**：抽出 `compileMdx` + registry + 盤點/改寫不相容文章；前台改渲染 compiled（仍讀舊欄位，先加 `compiled` 暫存欄位或記憶體快取）— 可獨立驗證效能
2. **PR2 – Schema + 資料遷移**：translation 表、relations、data migration（舊欄位保留）
3. **PR3 – API**：後台 / 前台 procedure 改讀寫 translation，locale + fallback；MCP 工具
4. **PR4 – 後台 UI**：語言 tabs、狀態 badge、分類翻譯表單
5. **PR5 – 前台 i18n 路由 + SEO**：locale segment、Paraglide 設定與 middleware、hreflang、語言切換、fallback 提示
6. **PR6 – 清理**：drop 舊欄位、移除 runtime evaluate 相關程式碼
7. （後續）AI 翻譯流程：MCP 一鍵翻譯、mdast 區塊級增量翻譯、後台即時預覽 Worker 化

## 9. 驗收

- 既有文章 / 日記網址與內容不變（zh-TW 無前綴）
- `/en/posts/<slug>` 有譯文顯示譯文，無則 fallback 並顯示提示
- 文章頁不再於請求時 evaluate MDX（檢查 server log / bundle 不含 MDX compiler）
- MCP 可建立文章、新增英文翻譯、預覽驗證錯誤
- 修改原文後，後台譯文顯示「過期」
- hreflang 與 sitemap 正確
- 型別檢查與 build 通過：`pnpm turbo build typecheck`

## 10. 待實作時確認

- 現有文章是否用到 MDX JS 表達式 / `export`（決定 hast JSON 方案可行性）
- notes 的 `mood` / `weather` 是自由文字還是固定選項（決定放主表或翻譯表）
- 預設語系 URL 是否省略前綴（本計畫假設省略）
