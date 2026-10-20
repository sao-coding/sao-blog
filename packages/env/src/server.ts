import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    GITHUB_CLIENT_ID: z.string().min(1),
    GITHUB_CLIENT_SECRET: z.string().min(1),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    CORS_ORIGIN: z
      .string()
      .transform((val) => JSON.parse(val))
      .pipe(z.array(z.url())),
    SERVER_URL: z.url(),
    BLOG_URL: z.url(),
    REVALIDATE_SECRET: z.string().min(16),
    // 全文搜尋（Typesense，自架）。全部選填：HOST 與 ADMIN_API_KEY 都有值才啟用，
    // 未設定時搜尋 / 索引同步一律略過，不影響其他功能。admin key 只在伺服器端使用。
    TYPESENSE_HOST: z.string().min(1).optional(),
    TYPESENSE_PORT: z.coerce.number().int().positive().default(8108),
    TYPESENSE_PROTOCOL: z.enum(["http", "https"]).default("http"),
    TYPESENSE_ADMIN_API_KEY: z.string().min(1).optional(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
