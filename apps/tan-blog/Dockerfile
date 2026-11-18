FROM node:24-slim AS base
RUN npm install -g corepack && corepack enable && corepack prepare pnpm@10.30.3 --activate
WORKDIR /app
COPY . .
RUN pnpm dlx turbo prune tan-blog --docker

FROM node:24-slim AS installer
RUN npm install -g corepack && corepack enable && corepack prepare pnpm@10.30.3 --activate
WORKDIR /app
COPY --from=base /app/out/json/ .
COPY --from=base /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=base /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
COPY --from=base /app/out/full/ .

ARG VITE_SERVER_URL=http://localhost:3090
ARG VITE_WS_URL=ws://localhost:3090
ARG VITE_SITE_URL=http://localhost:3004
ENV VITE_SERVER_URL=$VITE_SERVER_URL
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_SITE_URL=$VITE_SITE_URL
RUN pnpm --filter tan-blog build

FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
COPY --from=installer --chown=node:node /app/apps/tan-blog/.output /app/.output
USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", ".output/server/index.mjs"]
