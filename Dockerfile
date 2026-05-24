# Stage 1: 複製全部 → 再裝依賴
FROM node:22-alpine AS deps

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# 先複製所有原始碼
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json turbo.json ./
COPY apps/server apps/server
COPY packages packages

# 原始碼到位後再裝依賴
# --shamefully-hoist 讓 pnpm 建立 flat node_modules，bun build --compile 才能追蹤到傳遞依賴
RUN pnpm install --frozen-lockfile --shamefully-hoist

# Stage 2: 用 bun 編譯
FROM oven/bun AS build

WORKDIR /app
COPY --from=deps /app ./

RUN bun run --cwd apps/server compile

# Stage 3: 最終執行環境
FROM gcr.io/distroless/base

WORKDIR /app
COPY --from=build /app/apps/server/server /app/server

ENV NODE_ENV=production
EXPOSE 3000
CMD ["./server"]