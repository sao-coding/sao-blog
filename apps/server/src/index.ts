import { cors } from "@elysiajs/cors";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { createContext } from "@sao-blog/api/context";
import { appRouter } from "@sao-blog/api/routers/index";
import { auth } from "@sao-blog/auth";
import { oAuthDiscoveryMetadata, oAuthProtectedResourceMetadata } from "better-auth/plugins";
import { env } from "@sao-blog/env/server";
import { devicesRoutes } from "./devices";
import { mcpRoutes } from "./mcp";
import { Elysia } from "elysia";

const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ]
});
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

const app = new Elysia()
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
  .group("/api/devices", (app) => app.use(devicesRoutes))
  .use(mcpRoutes)
  .get("/.well-known/oauth-authorization-server", async ({ request }) =>
    reflectCorsOrigin(await oAuthDiscoveryMetadata(auth)(request), request),
  )
  .get("/.well-known/oauth-protected-resource", async ({ request }) =>
    reflectCorsOrigin(await oAuthProtectedResourceMetadata(auth)(request), request),
  )
  .get("/", () => "OK")
  .listen(3000, () => {
    console.log(`Server is running at ${env.SERVER_URL}`);
  });