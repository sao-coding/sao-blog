import { z } from "zod";
import type { Locale as DbLocale } from "@sao-blog/db/schema/index";
import type { CompiledContent, TocItem } from "@sao-blog/mdx/types";

// 與 DB enum 相同的語系清單。這支 schema 也會被前端（admin / tan-blog）在瀏覽器端引用，
// 所以不直接 import DB schema（會把 drizzle 帶進 bundle），改用下方型別斷言確保兩邊一致。
export const LOCALES = ["zh-TW", "en", "ja"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "zh-TW";

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const _localesMatchDb: Same<Locale, DbLocale> = true;
void _localesMatchDb;

export const localeSchema = z.enum(LOCALES);

/** 公開 API 的語系參數：未帶時使用預設語系 */
export const localeInput = { locale: localeSchema.default(DEFAULT_LOCALE) };

/** 回應中附帶的語系資訊（optional：後台等不帶語系的呼叫端不受影響） */
export const localizedMetaShape = {
  /** 實際回傳內容的語系 */
  locale: localeSchema.optional(),
  /** 請求的語系沒有已發布譯文，改回傳原文 */
  isFallback: z.boolean().optional(),
  /** 已發布的語系版本（含原文），給語言切換器用 */
  availableLocales: z.array(localeSchema).optional(),
  /** 該語言版本是否為 AI 翻譯 */
  translatedBy: z.enum(["human", "ai"]).optional(),
};

/** 單篇內容附帶的預編譯結果（hast JSON），前端可直接渲染、不必再編譯 */
export const compiledShape = {
  compiled: z.custom<CompiledContent>().nullable().optional(),
  toc: z.custom<TocItem[]>().nullable().optional(),
  readingTime: z.number().nullable().optional(),
};
