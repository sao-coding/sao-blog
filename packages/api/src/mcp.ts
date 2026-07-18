import type { Context as ElysiaContext } from "elysia";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { call, resolveContractProcedures, type AnyProcedure } from "@orpc/server";
import { ORPCError, safe } from "@orpc/client";
import { auth } from "@sao-blog/auth";
import { db } from "@sao-blog/db";
import { user as userTable } from "@sao-blog/db/schema/index";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { createContext, type Context } from "./context";
import { appRouter } from "./routers/index";

// Claude Desktop/網頁版透過 Better Auth 的 mcp plugin 走 OAuth 登入，取得的是
// OAuth access token，而非一般的 cookie session 或 apiKey plugin 發的 key。
// auth.api.getMcpSession 驗證 token 後只會回傳 { userId, clientId, scopes, ... }，
// 沒有完整的 user 物件，所以這裡另外查一次 user 表，組成跟 createContext 相容的
// Context 形狀，讓 protectedProcedure/adminProcedure 可以直接沿用同一套
// session.user.role/banned 判斷，不需要另外設計一套權限邏輯。
async function resolveOAuthContext(request: Request): Promise<Context | null> {
  const token = await auth.api.getMcpSession({ headers: request.headers });
  if (!token) return null;

  const [row] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.id, token.userId))
    .limit(1);
  if (!row) return null;

  const session = {
    session: {
      id: token.userId,
      token: token.accessToken,
      userId: token.userId,
      expiresAt: token.accessTokenExpiresAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      ipAddress: null,
      userAgent: null,
    },
    user: row,
  };

  return {
    session: session as unknown as Context["session"],
    ip: null,
    userAgent: null,
  };
}

// MCP 路由的 context 解析入口：先試 OAuth access token，沒有的話 fall back 回
// 既有的 createContext（apiKey / cookie session），不動 context.ts 本身，
// 確保 /rpc、/api 兩條既有路徑完全不受影響。
export async function resolveMcpContext(context: ElysiaContext): Promise<Context> {
  const oauthContext = await resolveOAuthContext(context.request);
  if (oauthContext) return oauthContext;
  return createContext({ context });
}

type LeafProcedure = { path: readonly string[]; procedure: AnyProcedure; inputSchema: z.ZodTypeAny };

let cachedLeaves: LeafProcedure[] | null = null;

// MCP tools/list 會把每個已註冊工具的 inputSchema 轉成 JSON Schema，任何一個轉換失敗
// （例如欄位為 z.date()，JSON Schema 無法表示）都會讓整個 tools/list 請求連帶失敗。
// 因此在註冊前先用同一套轉換（zod4 內建 toJSONSchema，MCP SDK 內部也是走這條路徑）
// 探測一次，轉換失敗的 procedure 直接跳過，不註冊成 tool，並印出警告方便之後修正。
async function getLeafProcedures(): Promise<LeafProcedure[]> {
  if (cachedLeaves) return cachedLeaves;

  const leaves: LeafProcedure[] = [];
  await resolveContractProcedures({ router: appRouter, path: [] }, ({ contract, path }) => {
    const procedure = contract as AnyProcedure;
    const inputSchema = (procedure["~orpc"].inputSchema as z.ZodTypeAny | undefined) ?? z.object({});

    try {
      z.toJSONSchema(inputSchema);
    } catch (error) {
      console.warn(
        `[mcp] 跳過工具 "${path.join(".")}"：input schema 無法轉換為 JSON Schema (${(error as Error).message})`,
      );
      return;
    }

    leaves.push({ path, procedure, inputSchema });
  });

  cachedLeaves = leaves;
  return leaves;
}

function toolName(path: readonly string[]): string {
  // 部分 MCP client（例如 Claude 的 FrontendRemoteMcpToolDefinition）要求
  // tool name 只能是 ^[a-zA-Z0-9_-]{1,64}$，不允許句點，所以用底線分隔路徑。
  return path.join("_");
}

function describeProcedure(procedure: AnyProcedure, path: readonly string[]): string {
  const { route } = procedure["~orpc"];
  if (route.summary) return route.summary;
  if (route.description) return route.description;
  return `${route.method ?? "CALL"} ${route.path ?? `/${path.join("/")}`}`;
}

// 建立一個新的 MCP server 實例，並將 appRouter 中的每個 procedure 註冊為一個 tool。
// context 由呼叫端（HTTP handler）解析好後傳入，權限檢查完全交給 procedure 自身的 middleware
// （protectedProcedure/adminProcedure），mcp.ts 本身不做任何額外的權限判斷。
export async function createMcpServer(context: Context): Promise<McpServer> {
  const server = new McpServer(
    { name: "sao-blog", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );

  const leaves = await getLeafProcedures();

  for (const { path, procedure, inputSchema } of leaves) {
    // 每個 tool 對應的 procedure 及其 input shape 都是執行期才從 appRouter 走訪出來的，
    // 無法讓 registerTool 的泛型在編譯期精準推導——實際的輸入驗證由 call() 底下的
    // oRPC procedure（沿用其 .input() zod schema）負責，這裡放寬型別是刻意的。
    const handler = async (args: Record<string, unknown>) => {
      const result = await safe(call(procedure, args, { context }));

      if (result.isSuccess) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result.data, null, 2) }],
          structuredContent: result.data as Record<string, unknown>,
        };
      }

      // result.isDefined 只反映 procedure 契約是否用 .errors() 宣告過這個錯誤型別，
      // 這個專案的 procedure 都沒有宣告 errorMap，所以無論是 ORPCError("FORBIDDEN") 還是
      // ORPCError("UNAUTHORIZED")，isDefined 一律是 false——實際判斷要用 instanceof。
      const message = result.error instanceof ORPCError
        ? `${result.error.code}: ${result.error.message}`
        : "Internal error while executing tool.";

      return {
        isError: true,
        content: [{ type: "text" as const, text: message }],
      };
    };

    server.registerTool(
      toolName(path),
      {
        description: describeProcedure(procedure, path),
        inputSchema: inputSchema as unknown as z.ZodRawShape,
      },
      handler as Parameters<typeof server.registerTool>[2],
    );
  }

  return server;
}
