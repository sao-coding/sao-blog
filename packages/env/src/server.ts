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
    // ── 真實 IP ─────────────────────────────────────────────────────────────
    // 只信任「最外層代理」寫入的標頭。Cloudflare 在最前面 → cf-connecting-ip；
    // Caddy / Nginx 在最前面 → x-forwarded-for（並設定 TRUSTED_PROXIES）。
    // API 連接埠絕對不能讓外部直接連到，否則任何標頭都能被偽造。
    CLIENT_IP_HEADER: z.string().min(1).default("x-forwarded-for"),
    // 代理伺服器的 IP / CIDR（逗號分隔）。x-forwarded-for 會從右往左略過這些位址，取第一個不是代理的
    TRUSTED_PROXIES: z
      .string()
      .optional()
      .transform((v) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : [])),
    // ── GeoLite2（IP 歸屬地）─────────────────────────────────────────────
    // https://www.maxmind.com 免費帳號 → Manage License Keys。沒設定時歸屬地一律空白
    MAXMIND_ACCOUNT_ID: z.string().min(1).optional(),
    MAXMIND_LICENSE_KEY: z.string().min(1).optional(),
    // mmdb 下載後存放的路徑（Docker 請掛 volume，重啟才不用重新下載）
    GEOIP_DB_PATH: z.string().min(1).default("./data/GeoLite2-City.mmdb"),
    // ── Cloudflare Turnstile ─────────────────────────────────────────────
    // 有設定才會驗證登入與留言；前台另外要設 VITE_TURNSTILE_SITE_KEY
    TURNSTILE_SECRET_KEY: z.string().min(1).optional(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
