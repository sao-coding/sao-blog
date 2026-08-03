import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_SERVER_URL: z.url(),
    VITE_WS_URL: z.string().min(1),
    VITE_SITE_URL: z.url(),
  },
  server: {
    // 與 apps/server 的 REVALIDATE_SECRET 共用同一組值：admin 端發文/改文後打
    // POST /api/revalidate 通知這裡清快取，靠這個 secret 驗證請求來源。
    REVALIDATE_SECRET: z.string().min(16),
  },
  runtimeEnv: {
    VITE_SERVER_URL: import.meta.env.VITE_SERVER_URL,
    VITE_WS_URL: import.meta.env.VITE_WS_URL,
    VITE_SITE_URL: import.meta.env.VITE_SITE_URL,
    // 伺服器端 runtime secret：故意讀 process.env 而非 import.meta.env，
    // 這樣容器部署時用實際注入的環境變數，不會被 Vite build 時的值寫死進 bundle。
    REVALIDATE_SECRET: process.env.REVALIDATE_SECRET,
  },
  emptyStringAsUndefined: true,
});
