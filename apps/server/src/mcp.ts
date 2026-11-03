import { createMcpServer, resolveMcpContext } from "@sao-blog/api/mcp";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { env } from "@sao-blog/env/server";
import { Elysia } from "elysia";

export const mcpRoutes = new Elysia().all(
  "/mcp*",
  async (context) => {
    const ctx = await resolveMcpContext(context);

    // /mcp 整個 endpoint 強制要求驗證（OAuth token、API Key、cookie session 三選一）。
    // 沒有任何憑證時直接回 401 + WWW-Authenticate，讓 Claude Desktop/網頁版能偵測到
    // 這個 server 需要登入，進而觸發 OAuth 流程；已帶合法憑證的請求（例如 Claude Code
    // 用的 API Key）不受影響，照舊直接放行。
    if (!ctx.session) {
      const wwwAuthenticateValue = `Bearer resource_metadata="${env.SERVER_URL}/.well-known/oauth-protected-resource"`;
      return Response.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Unauthorized: Authentication required",
          },
          id: null,
        },
        {
          status: 401,
          headers: { "WWW-Authenticate": wwwAuthenticateValue },
        },
      );
    }

    const server = await createMcpServer(ctx);
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined });

    await server.connect(transport);
    return transport.handleRequest(context.request);
  },
  {
    parse: "none",
  },
);
