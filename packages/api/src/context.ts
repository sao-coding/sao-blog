import type { Context as ElysiaContext } from "elysia";

import { auth } from "@sao-blog/auth";

export type CreateContextOptions = {
  request: Request;
  server: ElysiaContext["server"];
};

/**
 * 取得用戶端真實 IP。
 *
 * 反向代理 / CDN（Nginx、Cloudflare 等）會把真實 IP 放在 x-forwarded-for
 * 或 x-real-ip。直連時則用 socket 位址（Elysia server.requestIP）。
 * 注意：x-forwarded-for 可被用戶端偽造，此處僅用於「顯示歸屬地」，
 * 不可作為任何權限判斷依據。
 *
 * 重要：請只在呼叫端（route handler）以 `context.request` / `context.server`
 * 這種字面寫法傳入，不要包成 `{ context }` 物件簡寫再轉傳。Elysia 的 sucrose
 * 靜態分析是用正規表達式掃描 handler 原始碼文字來判斷要不要組裝 `server` 欄位，
 * 若該欄位的存取藏在外部函式或物件簡寫裡，分析不到就會直接把 server 設為
 * undefined，導致 requestIP 永遠拿不到值。
 */
function getClientIp(request: Request, server: ElysiaContext["server"]): string | null {
  const headers = request.headers;
  const normalize = (ip: string): string =>
    // 剝除 IPv4-mapped IPv6 前綴，例如 ::ffff:127.0.0.1 -> 127.0.0.1
    ip.replace(/^::ffff:/i, "").trim();

  const xff = headers.get?.("x-forwarded-for");
  if (xff) {
    // 取第一個（最靠近用戶端）的 hop
    const first = xff.split(",")[0];
    if (first) return normalize(first);
  }

  const xReal = headers.get?.("x-real-ip");
  if (xReal) return normalize(xReal);

  // Elysia / Bun 的 socket 位址
  const socketIp = server?.requestIP?.(request)?.address;
  return socketIp ? normalize(socketIp) : null;
}

export async function createContext({ request, server }: CreateContextOptions) {
  const headers = request.headers;
  const ip = getClientIp(request, server);
  console.log("建立 API 請求上下文，來源 IP：", ip);
  const userAgent = headers.get?.("user-agent") ?? null;
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
          return { session, ip, userAgent };
        }
      }
    } catch (e) {
      // 忽略驗證錯誤，後續再嘗試 cookie/session
    }
  }

  const session = await auth.api.getSession({ headers });
  return {
    session,
    ip,
    userAgent,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
