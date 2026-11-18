FROM node:24-slim AS base
RUN npm install -g corepack && corepack enable && corepack prepare pnpm@10.30.3 --activate
WORKDIR /app
COPY . .
RUN pnpm dlx turbo prune @sao-blog/admin --docker

FROM node:24-slim AS installer
RUN npm install -g corepack && corepack enable && corepack prepare pnpm@10.30.3 --activate
WORKDIR /app
COPY --from=base /app/out/json/ .
COPY --from=base /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=base /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
COPY --from=base /app/out/full/ .

ARG VITE_API_URL=http://localhost:3090
ARG VITE_BLOG_URL=http://localhost:3004
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_BLOG_URL=$VITE_BLOG_URL
RUN pnpm --filter @sao-blog/admin build

FROM nginx:1.29-alpine AS runner
COPY --from=installer /app/apps/admin/dist /usr/share/nginx/html/admin
EXPOSE 80
