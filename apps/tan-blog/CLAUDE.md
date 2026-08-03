# tan-blog — Claude Code 专案规则

## 概览

**tan-blog** 是一个 TanStack Start 博客应用，从 Next.js mdx-blog 迁移而来。使用 oRPC 连接后端 API（`apps/server`），支持 MDX 文章、评论、三语言 i18n、SEO 最佳实践。

### 关键决策（见 MIGRATION-TDD.md）

- **资料层**：oRPC over HTTP → `apps/server`（Elysia）；tan-blog 仅消费端
- **MDX**：`@mdx-js/mdx evaluate()` + 既有 unified pipeline；内容来自 API，非文件系统
- **i18n**：Paraglide JS 2，zh-Hant（base）/ en / ja，URL 前缀路由
- **Rendering**：文章/日记/专栏详情页 SSR + Nitro ISR 快取（`src/lib/isr/*.ts`，非 build-time prerender）；列表页 SSR + 短 TTL
- **Theme**：shadcn ScriptOnce ThemeProvider（暗色预设）

---

## 文件结构速查

```
tan-blog/
├── src/
│   ├── routes/              ← TanStack Router 文件路由（勿手编 routeTree.gen.ts）
│   │   ├── __root.tsx       ← 根 layout + head/Theme/Query/Universe.js
│   │   ├── (blog)/
│   │   │   ├── route.tsx    ← blog 区块 layout（header/footer/FAB）
│   │   │   ├── index.tsx    ← 首页
│   │   │   ├── posts.index.tsx
│   │   │   ├── posts.$slug.tsx ← 单篇文章（SSG）
│   │   │   ├── notes.* ← 笔记系统
│   │   │   ├── timeline.tsx
│   │   │   └── thinking.tsx
│   │   ├── login.tsx        ← 登入（beforeLoad 检查 session）
│   │   ├── sitemap[.]xml.ts ← sitemap（server route）
│   │   └── rss[.]xml.ts     ← RSS feed
│   ├── components/
│   │   ├── ui/              ← shadcn/ui × 40+ 元件
│   │   ├── mdx/
│   │   │   ├── parsers.ts   ← Shiki + remark/rehype 完整 pipeline
│   │   │   ├── mdx-content.tsx ← client 端 MDX 运行时
│   │   │   └── renderers/   ← Alert/Tabs/Carousel/Mermaid/ECharts 等
│   │   ├── layout/          ← Header/Footer/FAB
│   │   ├── animation/       ← Motion 动画
│   │   └── theme-provider.tsx ← ScriptOnce dark mode
│   ├── lib/
│   │   ├── orpc.ts          ← oRPC client（SSR headers 转发）
│   │   ├── mdx/
│   │   │   ├── compile.ts   ← compileMdx Server Fn
│   │   │   └── parsers.ts   ← Shiki/remark/rehype 配置
│   │   └── with-retry.ts    ← prerender 网络抖动保护
│   ├── store/               ← Zustand stores（Theme/Search/Comment 等）
│   ├── hooks/               ← 自製 React hooks
│   ├── config/              ← 常数配置
│   └── styles/              ← Tailwind globals.css + custom.css
├── public/
│   ├── favicon.ico
│   ├── js/universe.js       ← 背景动画
│   └── tanstack-*.png|svg   ← Logo
├── messages/                ← Paraglide i18n
│   ├── zh-Hant.json
│   ├── en.json
│   └── ja.json
├── project.inlang/
│   └── settings.json        ← Paraglide 配置（baseLocale: zh-Hant）
├── vite.config.ts           ← Vite + TanStack Start + prerender 配置
├── tsconfig.json
├── .env.local               ← 本地开发环境变数
├── package.json
└── MIGRATION-TDD.md         ← 详细迁移计划 & ADR
```

---

## 开发指南

### 新增路由

1. **在 `src/routes/` 新增档案**（遵循 TanStack 命名）

   - 目录式：`about/index.tsx`（URL `/about`）
   - Flat 式：`about.index.tsx`（同上）
   - 参数：`posts/$slug.tsx`（URL `/posts/:slug`）
   - Pathless layout：`_blog.tsx`（不含 URL；子路由 `_blog.posts.tsx` → `/posts`）
   - 群组：`(blog)/index.tsx`（URL 不含群组名）

2. **加入 loader（如需 SSR 资料）**

   ```tsx
   export const Route = createFileRoute('/posts/$slug')({
     loader: async ({ params }) => {
       return await queryClient.ensureQueryData(
         orpc.post.get.queryOptions({ slug: params.slug })
       )
     },
     head: ({ loaderData }) => ({
       meta: [
         { title: loaderData.post.title },
         { name: 'description', content: loaderData.post.excerpt }
       ]
     }),
     component: PostPage,
   })
   ```

3. **路由自动生成 `routeTree.gen.ts`**（dev server 自动）
   - 若删除路由后页面仍存在，手动启动 dev server 即可重新生成

### 新增 MDX block 元件

1. **在 `src/components/mdx/renderers/` 新增 React 元件**
   ```tsx
   export function Alert({ 
     type, 
     children 
   }: { 
     type: 'info' | 'warning' | 'error' | 'success'
     children: React.ReactNode 
   }) {
     return <div className={`alert alert-${type}`}>{children}</div>
   }
   ```

2. **在 MDX 中使用**（JSX 标签，非 fence）
   ```markdown
   <Alert type="warning">
     这是一个警告框
   </Alert>
   ```

3. **新元件须加到 MDX runtime（`mdx-content.tsx` 的 `components` 对象）**

### 国际化 (i18n)

1. **新增 UI 文案**：编辑 `messages/zh-Hant.json`、`en.json`、`ja.json`

   ```json
   {
     "hello": "你好",
     "blog_title": "我的博客"
   }
   ```

2. **组件中使用（typed）**

   ```tsx
   import { m } from '#/paraglide/messages'
   
   export function Header() {
     return <h1>{m.blog_title()}</h1>  // ✓ 型别检查，打错字编译失败
   }
   ```

3. **日期/时间本地化**

   ```tsx
   import { getLocale } from '#/paraglide/runtime'
   import { formatDate } from 'date-fns'
   import { zhTW, enUS, ja } from 'date-fns/locale'
   
   const localeMap = {
     'zh-Hant': zhTW,
     'en': enUS,
     'ja': ja,
   }
   
   export function FormattedDate({ date }: { date: Date }) {
     const locale = getLocale()
     return formatDate(date, 'PPP', { locale: localeMap[locale] })
   }
   ```

4. **新增语言**：修改 `project.inlang/settings.json` 的 `locales` 阵列（需同时新增对应 `messages/lang.json`）

### 数据取得

#### SSR 页面（推荐）

```tsx
export const Route = createFileRoute('/posts')({
  loader: async () => {
    // SSR 时在服务器取数据，序列化进 HTML
    return queryClient.ensureQueryData(
      orpc.post.list.queryOptions()
    )
  },
  component: PostsList,
})

function PostsList() {
  // client hydrate SSR 数据（Query 缓存已有，不会重新 fetch）
  const { data } = useQuery(orpc.post.list.queryOptions())
  return <div>{data.posts.map(...)}</div>
}
```

#### Client 页面（仅在必要时）

```tsx
function SearchPosts() {
  const [query, setQuery] = useState('')
  const { data } = useQuery(
    orpc.post.search.queryOptions({ q: query }),
    { enabled: query.length > 0 }
  )
  return ...
}
```

### 评论系统

- 集成于文章页（`CommentSection` 组件）
- oRPC 端点：`orpc.comment.list`、`orpc.comment.create`
- 前端校验：内容长度、Emoji picker、markdown 渲染
- 用户头像：`comment.user.avatar`（nullable）

---

## 常见工作流

### 编辑现有文章 / 笔记 / 专栏

1. 编辑后端 DB（via `apps/server` admin）
2. `apps/server` 的 create/update/delete handler 已经会自动打
   `POST ${BLOG_URL}/api/revalidate`（见 `packages/api/src/lib/notify-blog-revalidate.ts`），
   带上受影响的路径清单，不需要手动做任何事
3. tan-blog 收到後打 `src/routes/api/revalidate.ts`，比对路径呼叫
   `src/lib/isr/{post,note,topic}.ts` 里对应的 `invalidateCached*`，
   立即清掉 Nitro 的 ISR 快取（存在 Nitro 自己的 storage，不经过任何 CDN）
4. 保底：就算 revalidate 请求失败（网络抖动等），快取本身有 1 小时 `maxAge` + swr，
   最长 1 小时后也会自动刷新
5. 新文章/笔记/专栏不再需要重新 build 才看得到——详情页已经是 SSR + ISR 快取，
   不是 build-time 静态清单

### 调整样式

1. **全局**：编辑 `src/styles/globals.css`（Tailwind v4 CSS-first）
2. **特定组件**：用 Tailwind `className` 或 `tw-animate-css` 动画库
3. **shadcn 元件**：复制自 CLI，CSS vars 已由 `globals.css` 定义
4. **Dark mode**：自动由 `<html class="dark">` 切换（theme-provider 在 localStorage 持久化）

### 发布新文章流程

1. 在后端 admin 新增文章（存入 DB）
2. 等待 SWR cache 过期（通常 1–6 小时）或：
   - 调用 proxy purge endpoint（瞬间生效）
   - 或重新 `vite build` 包含新文章（prerender 列舉会打 API 发现新文章）
3. 文章页 URL 格式：`/posts/slug`（自动遵循 i18n 前缀 `/en/posts/slug` 等）

---

## 类型安全快速参考

### 路由参数（编译期检查）

```tsx
// 定义
<Link to="/posts/$slug" params={{ slug: 'hello' }} />
// ✗ 错：<Link to="/posts/$foo" /> → 编译失败（$foo 不存在）

// 读取
const { slug } = Route.useParams()  // typed as string
```

### Search params（zod 验证）

```tsx
export const Route = createFileRoute('/timeline')({
  validateSearch: z.object({
    year: z.string().optional(),
    tag: z.string().optional(),
  }),
  component: Timeline,
})

function Timeline() {
  const search = Route.useSearch()
  // search.year, search.tag 都是 typed
}
```

### Metadata & SEO

```tsx
export const Route = createFileRoute('/posts/$slug')({
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData.title },
      { name: 'og:image', content: loaderData.ogImage },
      { rel: 'canonical', href: `${import.meta.env.VITE_SITE_URL}/posts/${loaderData.slug}` },
    ],
    links: [
      { rel: 'alternate', hreflang: 'en', href: `/en/posts/${loaderData.slug}` },
      { rel: 'alternate', hreflang: 'ja', href: `/ja/posts/${loaderData.slug}` },
      { rel: 'alternate', hreflang: 'x-default', href: `/posts/${loaderData.slug}` },
    ],
  }),
})
```

---

## 构建和部署

### 本地开发

```bash
pnpm --filter tan-blog dev   # Port 3002（改自 package.json）
pnpm --filter tan-blog build # 预渲染 + 生成 .output/
node apps/tan-blog/.output/server/index.mjs  # 测试生产构建
```

### CI/CD（Dockerfile 示例）

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable pnpm
COPY . .
RUN pnpm install --frozen-lockfile
# Build 时需 apps/server 可连接
ARG VITE_SERVER_URL=http://server:4000
RUN pnpm --filter tan-blog build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/tan-blog/.output .
EXPOSE 3000
CMD ["node", "server/index.mjs"]
```

### Cache 策略（Nitro ISR，非 CDN/反代层）

详情页（`/posts/$slug`、`/notes/$id`、`/notes/topics/$slug`）的 freshness 权威来源是
tan-blog 自己的 Nitro server，不依赖任何外部 CDN/Caddy/Nginx purge：

- `src/lib/isr/post.ts` / `note.ts` / `topic.ts`：用 `defineCachedFunction`（`nitro/cache`）
  包住「打 API + 编译 MDX」，key 是 slug/id，`maxAge: 3600`、`swr: true`
- `src/routes/api/revalidate.ts`：接收 `apps/server` 发来的 `POST /api/revalidate`
  （header `x-revalidate-secret` 需与 `REVALIDATE_SECRET` 一致），依路径呼叫对应
  `invalidateCached*(key)`，让快取立即失效——不用等 `maxAge`，也不需要浏览器/CDN配合
- 浏览器端 `headers()` 只给短 `max-age=30, must-revalidate`：freshness 已经由
  Nitro 端保证，浏览器每次重验证的成本很低（命中 Nitro 快取），没必要靠长 `max-age`
  硬撑却换来「浏览器本地副本清不掉」的风险
- 列表页（`/`、`/posts`、`/notes`、`/notes/topics`）维持纯 SSR，没有这层快取，
  `/api/revalidate` 收到这些路径会直接忽略（无 cache 可清）

---

## 检查清单 ✓

### 新功能提交前

- [ ] `pnpm --filter tan-blog typecheck` 无错误
- [ ] 新路由文件已创建、loader/head/component 完整
- [ ] 新 i18n 文案已同步三语 `messages/*.json`
- [ ] 新 MDX 元件已加入 `mdx-content.tsx` 的 `components`
- [ ] 若改动 route/cache headers，已验证 SEO meta 与 canonical 正确
- [ ] 若改 oRPC 调用，已在 loader 中用 `getRequestHeaders()` 转发 cookie（认证）

### 构建前

- [ ] `.env.local` 中 `VITE_SERVER_URL` 指向正确后端、`REVALIDATE_SECRET` 与 `apps/server` 一致
- [ ] `pnpm --filter tan-blog build` 成功（不再需要 `apps/server` 在线——详情页不是 build-time prerender）
- [ ] 样本页面 view-source 检查：SSR HTML 含数据、meta tags 正确

---

## 常见错误排查

| 症状 | 原因 | 解法 |
|---|---|---|
| `routeTree.gen.ts` 编译错误 | 删除路由后未重新生成 | 重启 dev server（自动生成）或 `pnpm run generate-routes` |
| Link 报 `unknown route` | 路由文件不存在或命名错误 | 检查 `src/routes/` 档案名、确保 `tsr generate` 已运行 |
| SSR 页面显示旧数据 | Query `staleTime` 太高，或 `/api/revalidate` 没被正确呼叫/密钥不符 | 减低 `staleTime`；检查 `apps/server` 的 `notifyBlogRevalidate` 呼叫有没有成功（看 log）、`REVALIDATE_SECRET` 两邊是否一致 |
| i18n 文案显示 `m.key.()` | 新增 UI 文案忘记在 `messages/` 中定义 | 在三语 messages JSON 中补充对应 key |
| SSR 时 oRPC 无 auth cookie | loader 未转发 headers | 在 loader 中用 `getRequestHeaders()` 并传给 RPCLink |
| Dark mode 闪屏（FOUC） | `ScriptOnce` 运行时序太晚 | 确保 theme-provider `ScriptOnce` 在 `<body>` 最顶端 |
| Prerender 失败 | `apps/server` 无法连接或 API timeout | 运行 health check；增加 `withRetry` 重试次数；检查防火墙/网络 |

---

## 文档指南

**必读**：
- [`MIGRATION-TDD.md`](./MIGRATION-TDD.md)（10 阶段迁移计划、所有设计决策 & ADR）
- [README.md](./README.md)（项目快速开始 & 部署指南）

**外部资源**：
- [TanStack Start 官方文档](https://tanstack.com/start/latest)
- [TanStack Router 指南](https://tanstack.com/router/latest)
- [Paraglide JS 文档](https://inlang.com/m/gerre34r)
- [Shadcn/ui 组件库](https://ui.shadcn.com/)

---

## 交流 & 反馈

若遇困难或需要引进新技术，参考 MIGRATION-TDD 的对应 section 或 ADR 以了解设计背景。需要协助时，可附上相关 error log 或分支。
