# Stage 1: 用 turbo prune 算出 server 真正需要的 package 子集
FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm dlx turbo prune @sao-blog/server --docker

# Stage 2: 只裝 prune 出來的依賴（不含 apps/web、packages/ui 等 server 用不到的東西）
FROM node:22-alpine AS installer
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY --from=base /app/out/json/ .
COPY --from=base /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=base /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml

# node-linker=hoisted 讓 pnpm 直接複製套件（不用 symlink），bun build --compile 才能正確讀取所有檔案
RUN echo "node-linker=hoisted" >> .npmrc
# cache mount 讓 pnpm store 跨 build 保留，lockfile 沒變時不用重新下載套件
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Stage 3: 補上完整原始碼，用 bun 編譯
FROM oven/bun AS build
WORKDIR /app
COPY --from=installer /app ./
COPY --from=base /app/out/full/ .

RUN bun run --cwd apps/server compile

# Stage 4: 最終執行環境
FROM gcr.io/distroless/base

WORKDIR /app
COPY --from=build /app/apps/server/server /app/server

ENV NODE_ENV=production
EXPOSE 3000
CMD ["./server"]
