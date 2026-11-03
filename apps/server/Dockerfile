# 不再用 bun build --compile 編成單一執行檔：sharp（文章圖片讀尺寸、產生模糊預覽）的原生模組
# 需要旁邊 @img/sharp-libvips-* 套件裡的 libvips 共用函式庫，單一執行檔只會解壓 .node 本身，
# 載入時找不到 libvips（oven-sh/bun#44063，尚未修正）。改成帶著 node_modules 用 bun 直接執行。

# Stage 1: 用 turbo prune 算出 server 真正需要的 package 子集
FROM node:24-alpine AS base
RUN npm install -g corepack && corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm dlx turbo prune @sao-blog/server --docker

# Stage 2: 只裝 prune 出來的依賴（不含 apps/web、packages/ui 等 server 用不到的東西）
# 用 glibc（Debian）而不是 Alpine（musl）：sharp 依安裝時的平台下載預編譯檔，
# 必須和執行環境（oven/bun，Debian）一致，不然會裝到 linuxmusl 版而載入失敗
FROM node:24-slim AS installer
RUN npm install -g corepack && corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY --from=base /app/out/json/ .
COPY --from=base /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=base /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml

# node-linker=hoisted：套件直接放在 node_modules（不用 symlink），複製到下一階段時不會斷連結
RUN echo "node-linker=hoisted" >> .npmrc
# cache mount 讓 pnpm store 跨 build 保留，lockfile 沒變時不用重新下載套件
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Stage 3: 執行環境：bun 直接跑 TypeScript 原始碼
# 版本和本機開發一致（bun --version）；slim 是 Debian（glibc），符合 sharp 的需求
FROM oven/bun:1.3.14-slim
WORKDIR /app
COPY --from=installer /app ./
COPY --from=base /app/out/full/ .

ENV NODE_ENV=production
EXPOSE 3000
# 從 /app 啟動：GEOIP_DB_PATH 預設 ./data/... 相對於這裡（啟動時會下載到 /app/data，需可寫）
CMD ["bun", "apps/server/src/index.ts"]
