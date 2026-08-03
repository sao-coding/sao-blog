# tan-blog

一個使用 TanStack Start 構建的個人博客應用，從 Next.js mdx-blog 遷移而來。支持 MDX 文章、筆記、時間軸等功能，並實現三語言國際化（繁體中文、英文、日文）。

## 快速開始

```bash
# 安装依赖
pnpm install

# 启动开发服务器（端口 3002）
pnpm --filter tan-blog dev

# 构建生产版本
pnpm --filter tan-blog build

# 运行生产服务器
node apps/tan-blog/.output/server/index.mjs
```

## 项目结构

```
src/
├── routes/           # 文件路由（TanStack Router）
├── components/       # React 組件（UI、MDX renderers、主題等）
├── lib/              # 工具函数（oRPC client、MDX 编译、日期格式化）
├── store/            # Zustand 状态管理（主題、搜尋、評論等）
├── styles/           # 全球樣式（Tailwind v4）
└── paraglide/        # i18n 消息（编译期生成）
```

## 核心功能

### 博客 & 筆記
- **文章頁面**（`/posts/$slug`）：SSG + SWR cache
- **筆記系統**（`/notes/$id`）：支援主題分類
- **時間軸**（`/timeline`）：按時間組織內容
- **分類瀏覽**（`/categories/$slug`）

### 國際化 (i18n)
- 使用 **Paraglide JS 2**（compile-time 型別安全）
- 支援三語言：繁體中文（預設）、English、日本語
- URL strategy：`/` → `/en/...` → `/ja/...`
- UI 文案翻譯、日期/時間格式本地化

### SEO 最佳實踐
- 每頁 Open Graph / Twitter Card meta tags
- JSON-LD 結構化數據（BlogPosting、WebSite）
- Sitemap.xml 和 RSS feed
- Canonical URL 與 hreflang alternates
- 自動生成 robots.txt

### 技術特點
- **SSG + ISR 替代**：靜態預渲染（prerender）+ SWR Cache-Control headers
- **MDX 渲染**：`@mdx-js/mdx` evaluate + Shiki 高亮 + remark/rehype 插件
- **資料來源**：oRPC 連接 `apps/server`（Elysia 後端）
- **認証**：Better Auth client（連接 apps/server auth 端點）
- **樣式**：Tailwind CSS v4（CSS-first）+ shadcn/ui 元件庫
- **評論系統**：內建評論 emoji picker 與 markdown 渲染

## 環境變數

建立 `.env.local`：

```env
# API 伺服器
VITE_SERVER_URL=http://localhost:4000

# 評論 WebSocket（可選，開發時 fallback 到 HTTP）
VITE_WS_URL=ws://localhost:4000

# 部署用：用於生成 canonical URL 與 sitemap
VITE_SITE_URL=https://blog.example.com

# 預渲染快取清除祕鑰（可選）
REVALIDATE_SECRET=your-secret-key
```

## 開發工作流

### 路由
- 新增路由：在 `src/routes/` 新增檔案（使用 TanStack 檔案約定）
- 路由完全型別安全：`<Link to="/posts/$slug" params={{ slug: 'hello' }}>` ✓ 編譯期檢查
- **勿手動編輯** `routeTree.gen.ts`（自動生成，dev server 會刷新）

### MDX 文章
- 文章存於 `apps/server` 資料庫，經 oRPC 取得 MDX 字串
- 支援的 block 元件：`<Alert />`、`<Accordion />`、`<Tabs />`、`<Carousel />`、`<Progress />`、`<Mermaid />`、`<ECharts />`
- 代碼高亮由 Shiki 處理（34 語言、自動主題適配）
- KaTeX 數學、表格、腳註均支援

### 數據取得
- **SSR 頁面**：route `loader` + `queryClient.ensureQueryData()` → SSR 期間資料已序列化進 HTML
- **Client 補全**：組件內 `useQuery()` hydrate SSR 資料、自動去重
- **Server Functions**：`createServerFn()` 自動驗證（zod）、可用 middleware，取代 Server Action

### 主題切換
- 暗色模式預設開啟（localStorage persistence）
- 由 `ScriptOnce` 嵌入式腳本避免 FOUC（Flash of Unstyled Content）
- 全站 Tailwind `dark:` 前綴已配置

## 構建 & 部署

### 靜態預渲染 (Prerender)
```bash
pnpm --filter tan-blog build
```

- Vite plugin 在 build 時打 `apps/server` API 列舉所有 `/posts/$slug`、`/notes/$id` 等
- 靜態 HTML 輸出於 `.output/public/`
- i18n：三語言路徑（`/posts/...`、`/en/posts/...`、`/ja/posts/...`）均預渲染

### Docker 部署

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY . .
RUN corepack enable pnpm && pnpm install --frozen-lockfile
# build 時需傳入 VITE_SERVER_URL（內網 API 地址）
ARG VITE_SERVER_URL=http://server:4000
RUN pnpm --filter tan-blog build
EXPOSE 3000
CMD ["node", "apps/tan-blog/.output/server/index.mjs"]
```

### Reverse Proxy（Caddy/Nginx）

推薦使用 **Caddy**（自動 TLS）：

```caddy
blog.example.com {
    handle /admin/* {
        # admin 單獨頻域
        reverse_proxy https://blog-admin.example.com
    }
    handle {
        reverse_proxy tan-blog:3000
        encode gzip
        # 啟用 SWR cache
        cache {
            match /posts/* /notes/* /en/posts/* /en/notes/* /ja/posts/* /ja/notes/*
        }
    }
}
```

**Nginx** 則改用 `proxy_cache_use_stale updating`（SWR 語義）。

## 性能指標

- **Lighthouse**：目標 ≥ 95（Performance/Accessibility/Best Practices）
- **First Contentful Paint**：<1s（prerender 頁面）
- **Time to Interactive**：<2s
- **Cache Strategy**：
  - 文章頁（SSG）：`max-age=3600, stale-while-revalidate=86400` （1 小時新鮮、24 小時補全）
  - 列表頁（SSR）：`max-age=60-300, stale-while-revalidate=600`
  - 登入頁：`no-store`

## 常見任務

### 編輯文章內容
1. 於 `apps/server` 資料庫或 admin 面板編輯文章
2. 對於靜態預渲染的文章，編輯後需：
   - **快速更新**：proxy cache purge（呼叫 Caddy/Nginx purge endpoint）
   - **完整刷新**：重新 `vite build` 並部署 `.output/`
   - **緩衝**：依賴 SWR 過期（預設 1 小時內見最新、24 小時內仍可用舊版）

### 新增路由
1. 在 `src/routes/` 新增檔案（e.g., `about.tsx`）
2. Dev server 自動重新生成 `routeTree.gen.ts`
3. 新增對應 route 的 `loader`（若需 SSR 資料）與 `head()`（若需 SEO meta）

### 調整 i18n 文案
1. 編輯 `project.inlang/messages/zh-Hant.json`、`en.json`、`ja.json`
2. 於組件使用 `m.key()` 呼叫（typed）
3. Dev server 重新生成 `src/paraglide/` 編譯輸出

## 常見陷阱 ⚠️

1. **routeTree.gen.ts 衝突**：勿手編；刪 route 後 `dev` 自動重新生成
2. **oRPC SSR headers**：loader 內用 `getRequestHeaders()` 轉發 cookie（認証）
3. **Prerender 依賴性**：build 需 `apps/server` 在線（health check 先打通）
4. **FOUC（Flash of Unstyled Content）**：確保 `ScriptOnce` 於 body 最頂端
5. **i18n 文案缺失**：新增 UI 文案要同步三語 messages，否則顯示 fallback key

## 進一步了解

- [遷移技術設計文件](./MIGRATION-TDD.md)（詳細架構決策 & 10 階段遷移計畫）
- [TanStack Start 官方文件](https://tanstack.com/start)
- [TanStack Router 文件](https://tanstack.com/router)
- [Paraglide JS 官方文件](https://inlang.com/m/gerre34r)
