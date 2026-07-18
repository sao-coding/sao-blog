import { createContext } from "@sao-blog/api/context";
import { createMcpServer } from "@sao-blog/api/mcp";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { Elysia } from "elysia";

export const mcpRoutes = new Elysia().all(
  "/mcp*",
  async (context) => {
    const ctx = await createContext({ context });
    const server = await createMcpServer(ctx);
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined });

    await server.connect(transport);
    return transport.handleRequest(context.request);
  },
  {
    parse: "none",
  },
);
