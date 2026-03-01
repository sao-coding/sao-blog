import type { Context as ElysiaContext } from "elysia";

import { auth } from "@sao-blog/auth";

export type CreateContextOptions = {
  context: ElysiaContext;
};

export async function createContext({ context }: CreateContextOptions) {
  const headers = context.request.headers;
  const authHeader = headers.get?.("authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const xApiKey = headers.get?.("x-api-key") ?? null;
  console.log("Authorization information:", { bearer, xApiKey });
  // 優先使用 Bearer 或 x-api-key 進行 API Key 驗證
  const key = bearer ?? xApiKey;
  if (key) {
    try {
      const result = await auth.api.verifyApiKey({ body: { key } });
      console.log("API Key verification result:", result.valid && result.key ? "valid" : "invalid");
      if (result.valid && result.key) {
        const session = await auth.api.getSession({
          headers: new Headers({ "x-api-key": key }),
        });
        console.log("Session retrieved using API Key:", session);
        if (session) {
          return { session };
        }
      }
    } catch (e) {
      // 忽略驗證錯誤，後續再嘗試 cookie/session
    }
  }

  const session = await auth.api.getSession({ headers: context.request.headers });
  return {
    session,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
