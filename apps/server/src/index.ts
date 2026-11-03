import { cors } from "@elysiajs/cors";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { RPCHandler as WsRPCHandler } from "@orpc/server/bun-ws";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { createContext, createContextFromHeaders, type Context } from "@sao-blog/api/context";
import { appRouter } from "@sao-blog/api/routers/index";
import { auth } from "@sao-blog/auth";
import { oAuthDiscoveryMetadata, oAuthProtectedResourceMetadata } from "better-auth/plugins";
import { env } from "@sao-blog/env/server";
import { devicesRoutes } from "./devices";
import { mcpRoutes } from "./mcp";
import { initGeoIp } from "@sao-blog/api/lib/geoip";
import { buildFriendCircleJson } from "@sao-blog/api/lib/friend-circle";
import { Elysia } from "elysia";

const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ]
});
// 同一套 router 走 WebSocket（首頁筆跡的即時轉發）。只有接上連線這幾行跟框架有關，router 本身不變
const wsHandler = new WsRPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});
// 每條連線建立時算一次 context（登入狀態、IP），之後每則訊息共用
const wsContexts = new WeakMap<object, Promise<Context>>();

const apiHandler = new OpenAPIHandler(appRouter, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
      specGenerateOptions: {
        servers: [
          { url: env.SERVER_URL + "/api" },
        ],
      },
    }),
  ],
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

// Better Auth 的 OAuth 端點會回 Access-Control-Allow-Origin: "*"，但外層 cors()
// 開了 credentials: true，瀏覽器不允許兩者同時出現，把 "*" 換成反射的實際 Origin。
function reflectCorsOrigin(response: Response, request: Request): Response {
  if (response.headers.get("access-control-allow-origin") === "*") {
    const origin = request.headers.get("origin");
    if (origin) {
      response.headers.set("access-control-allow-origin", origin);
      response.headers.append("vary", "Origin");
    }
  }
  return response;
}

new Elysia()
  .use(
    cors({
      origin: env.CORS_ORIGIN,
      methods: ["GET", "POST", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "x-api-key", "Mcp-Protocol-Version", "Mcp-Session-Id"],
      exposeHeaders: ["Mcp-Session-Id", "WWW-Authenticate"],
      credentials: true,
    }),
  )
  .all("/api/auth/*", async (context) => {
    const { request, status } = context;
    if (["POST", "GET"].includes(request.method)) {
      const response = await auth.handler(request);
      return reflectCorsOrigin(response, request);
    }
    return status(405);
  })
  .all(
    "/rpc*",
    async (context) => {
      const { response } = await rpcHandler.handle(context.request, {
        prefix: "/rpc",
        context: await createContext({ context }),
      });
      return response ?? new Response("Not Found", { status: 404 });
    },
    {
      parse: "none",
    },
  )
  .all(
    "/api*",
    async (context) => {
      const { response } = await apiHandler.handle(context.request, {
        prefix: "/api",
        context: await createContext({ context }),
      });
      return response ?? new Response("Not Found", { status: 404 });
    },
    {
      parse: "none",
    },
  )
  .ws("/ws/rpc", {
    open(ws) {
      const request = (ws.data as { request: Request }).request;
      // WebSocket 不走 CORS：自己檢查 Origin，只收自己網站來的連線
      const origin = request.headers.get("origin");
      if (origin && !env.CORS_ORIGIN.includes(origin)) {
        ws.close(1008, "origin");
        return;
      }
      wsContexts.set(ws.raw, createContextFromHeaders(request.headers, ws.raw.remoteAddress));
    },
    async message(ws, message) {
      const context = wsContexts.get(ws.raw);
      if (!context) return;
      // Elysia 會先把 JSON 字串解析成物件，oRPC 要原本的字串
      const data = typeof message === "string" || ArrayBuffer.isView(message) ? message : JSON.stringify(message);
      await wsHandler.message(ws.raw, data as string, { context: await context });
    },
    close(ws) {
      wsHandler.close(ws.raw);
      wsContexts.delete(ws.raw);
    },
  })
  .group("/api/devices", (app) => app.use(devicesRoutes))
  .use(mcpRoutes)
  .get("/.well-known/oauth-authorization-server", async ({ request }) =>
    reflectCorsOrigin(await oAuthDiscoveryMetadata(auth)(request), request),
  )
  .get("/.well-known/oauth-protected-resource", async ({ request }) =>
    reflectCorsOrigin(await oAuthProtectedResourceMetadata(auth)(request), request),
  )
  // 朋友圈（跨 blog 共用的 JSON 規格）：任何網站都能讀，所以 CORS 用 *、不帶 cookie
  .get("/friends.json", async ({ set }) => {
    set.headers["access-control-allow-origin"] = "*";
    set.headers["cache-control"] = "public, max-age=300, stale-while-revalidate=600";
    return buildFriendCircleJson();
  })
  .get("/", () => "OK")
  .listen(3000, () => {
    console.log(`Server is running at ${env.SERVER_URL}`);
    // 背景載入 / 下載 GeoLite2（沒設定 MaxMind 金鑰時什麼都不做）
    initGeoIp();
  });