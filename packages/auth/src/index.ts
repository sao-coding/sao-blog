import { expo } from "@better-auth/expo";
import { db } from "@sao-blog/db";
import * as schema from "@sao-blog/db/schema/index";
import { env } from "@sao-blog/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { apiKey } from "@better-auth/api-key"
import { openAPI, admin, username, mcp, captcha } from "better-auth/plugins";
import { getSecuritySettings } from "@sao-blog/db/settings";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { isAllowedMcpRedirect } from "./mcp-redirect";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: schema,
  }),
  trustedOrigins: [
    ...env.CORS_ORIGIN.map(origin => origin.trim()),
    "sao-blog://",
    ...(env.NODE_ENV === "development"
      ? ["exp://", "exp://**", "exp://192.168.*.*:*/**", "http://localhost:8081"]
      : []),
  ],
  hooks: {
    // MCP 動態註冊只接受白名單內的 redirect_uri，原因見 mcp-redirect.ts
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/mcp/register") return;
      const uris: unknown = (ctx.body as { redirect_uris?: unknown } | undefined)?.redirect_uris;
      if (!Array.isArray(uris)) return; // 交給 plugin 自己的驗證回錯誤
      const rejected = uris.filter((u) => typeof u !== "string" || !isAllowedMcpRedirect(u));
      if (rejected.length > 0) {
        throw new APIError("BAD_REQUEST", {
          error: "invalid_redirect_uri",
          error_description: `redirect_uri is not allowed: ${rejected.map(String).join(", ")}`,
        });
      }
    }),
  },
  emailAndPassword: {
    enabled: true,
    // 前台沒有註冊表單，但 /sign-up/email 端點原本仍開著，任何人都能直接打 API 註冊。
    // 帳密帳號只由管理員在後台建立（admin plugin 的 createUser 不受這個設定影響）
    disableSignUp: true,
  },
  rateLimit: {
    // better-auth 預設只在 production 啟用；記憶體儲存（單一伺服器）
    enabled: env.NODE_ENV === "production",
    window: 60,
    max: 100,
    customRules: {
      // 帳密登入次數跟著後台「留言與安全」設定走，改了不用重啟（設定有 30 秒快取）
      "/sign-in/username": async () => ({ window: 60, max: (await getSecuritySettings()).rateLimit.signInPerIpPerMinute }),
      "/sign-in/email": async () => ({ window: 60, max: (await getSecuritySettings()).rateLimit.signInPerIpPerMinute }),
    },
  },
  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    },
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  advanced: {
    database: {
      generateId: false,
    },
    // 與 API 的 lib/client-ip.ts 同一套規則：只信任最外層代理寫的標頭
    ipAddress: {
      ipAddressHeaders: [env.CLIENT_IP_HEADER],
      ...(env.TRUSTED_PROXIES.length > 0 ? { trustedProxies: env.TRUSTED_PROXIES } : {}),
    },
    
    crossSubDomainCookies: {
      enabled: env.NODE_ENV === "production",
      domain: env.NODE_ENV === "production" ? ".sao-x.com" : undefined, // 根網域，讓 cookie 在 blog / blog-admin / blog-api 子網域間共享
    },
    defaultCookieAttributes: {
      sameSite: env.NODE_ENV === "production" ? "none" : "lax",
      secure: env.NODE_ENV === "production",
      httpOnly: true,
      domain: env.NODE_ENV === "production" ? ".sao-x.com" : undefined, // 根網域，讓 cookie 在 blog / blog-admin / blog-api 子網域間共享
    },
  },
  plugins: [
    // 帳密登入要通過 Turnstile（前台在請求帶 x-captcha-response）。
    // 沒設定 secret 時指向一個不存在的路徑等於停用：不能用條件展開（plugins 的型別會變寬，
    // session 上的 role / banned 就不見了），空陣列又會退回 plugin 的預設端點
    captcha({
      provider: "cloudflare-turnstile",
      secretKey: env.TURNSTILE_SECRET_KEY ?? "disabled",
      endpoints: env.TURNSTILE_SECRET_KEY
        ? ["/sign-in/username", "/sign-in/email", "/request-password-reset"]
        : ["/__captcha-disabled__"],
    }),
    admin(),
    username(),
    openAPI(),
    expo(),
    apiKey({
      enableSessionForAPIKeys: true,
      rateLimit: {
        enabled: false,
      },
    }),
    mcp({
      loginPage: `${env.BLOG_URL}/login`,
      resource: `${env.SERVER_URL}/mcp`,
    }),
  ],
});
