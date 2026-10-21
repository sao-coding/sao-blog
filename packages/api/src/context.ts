import type { Context as ElysiaContext } from "elysia";

import { auth } from "@sao-blog/auth";
import { getClientIp } from "./lib/client-ip";

export type CreateContextOptions = {
  context: ElysiaContext;
};

export async function createContext({ context }: CreateContextOptions) {
  const headers = context.request.headers;
  // 規則見 lib/client-ip.ts（只信任 CLIENT_IP_HEADER；x-forwarded-for 從右往左略過代理）
  const socketIp = (context as ElysiaContext & {
    server?: { requestIP?: (req: Request) => { address?: string } | null };
  }).server?.requestIP?.(context.request)?.address;
  const ip = getClientIp(headers, socketIp);
  const userAgent = headers.get?.("user-agent") ?? null;
  const authHeader = headers.get?.("authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const xApiKey = headers.get?.("x-api-key") ?? null;
  // 優先使用 Bearer 或 x-api-key 進行 API Key 驗證
  const key = bearer ?? xApiKey;
  if (key) {
    try {
      const result = await auth.api.verifyApiKey({ body: { key } });
      if (result.valid && result.key) {
        const session = await auth.api.getSession({
          headers: new Headers({ "x-api-key": key }),
        });
        if (session) {
          return { session, ip, userAgent };
        }
      }
    } catch (e) {
      // 忽略驗證錯誤，後續再嘗試 cookie/session
    }
  }

  const session = await auth.api.getSession({ headers: context.request.headers });
  return {
    session,
    ip,
    userAgent,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
