import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { call, resolveContractProcedures, type AnyProcedure } from "@orpc/server";
import { ORPCError, safe } from "@orpc/client";
import { z } from "zod";

import type { Context } from "./context";
import { appRouter } from "./routers/index";

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
  return path.join(".");
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
