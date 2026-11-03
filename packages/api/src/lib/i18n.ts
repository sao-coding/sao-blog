import { db } from "@sao-blog/db";
import {
  categoryTranslations,
  noteTranslations,
  postTranslations,
} from "@sao-blog/db/schema/index";
import { compileMdx, compiledHashOf, type CompileProfile, type CompiledContent, type TocItem } from "@sao-blog/mdx";
import { and, eq, inArray, or } from "drizzle-orm";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "../schema/i18n";
import { resolveImageMeta } from "./image-meta";

// 公開 API 的多語言讀取：沿用各 router 既有的查詢（主表），再把選中的語言版本疊上去。
//
// 選擇規則（每篇內容）：
//   1. 請求語系有「已發布」譯文 → 用它
//   2. 否則用原文（is_source）→ isFallback = true（請求語系 ≠ 原文語系時）
//   3. 連原文 translation 都沒有（尚未跑遷移的舊資料）→ 直接用主表欄位
// availableLocales = 已發布的譯文語系 + 原文語系，依 LOCALES 順序排列

export interface LocalizedMeta {
  locale: Locale;
  isFallback: boolean;
  availableLocales: Locale[];
  translatedBy: "human" | "ai";
}

type BaseRow = {
  id: string;
  title: string;
  summary?: string | null;
  content?: string;
  defaultLocale?: Locale;
};

type Candidate = {
  id: string;
  ownerId: string;
  locale: Locale;
  title: string;
  summary: string | null;
  content: string;
  published: boolean;
  isSource: boolean;
  translatedBy: "human" | "ai";
};

const sortLocales = (locales: Iterable<Locale>) =>
  LOCALES.filter((l) => new Set(locales).has(l));

function overlay<T extends BaseRow>(
  rows: T[],
  candidates: Candidate[],
  locale: Locale,
): { items: (T & LocalizedMeta)[]; chosen: Map<string, string> } {
  const byOwner = new Map<string, Candidate[]>();
  for (const c of candidates) {
    const list = byOwner.get(c.ownerId) ?? [];
    list.push(c);
    byOwner.set(c.ownerId, list);
  }

  const chosen = new Map<string, string>();
  const items = rows.map((row) => {
    const list = byOwner.get(row.id) ?? [];
    const source = list.find((c) => c.isSource);
    const published = list.filter((c) => c.published);
    const pick = published.find((c) => c.locale === locale) ?? source;
    const sourceLocale = source?.locale ?? row.defaultLocale ?? DEFAULT_LOCALE;
    const availableLocales = sortLocales([
      ...published.map((c) => c.locale),
      sourceLocale,
    ]);

    if (!pick) {
      return {
        ...row,
        locale: sourceLocale,
        isFallback: sourceLocale !== locale,
        availableLocales,
        translatedBy: "human" as const,
      };
    }

    chosen.set(row.id, pick.id);
    return {
      ...row,
      title: pick.title,
      ...("summary" in row ? { summary: pick.summary ?? row.summary ?? null } : {}),
      ...("content" in row ? { content: pick.content } : {}),
      locale: pick.locale,
      isFallback: pick.locale !== locale,
      availableLocales,
      translatedBy: pick.translatedBy,
    };
  });

  return { items, chosen };
}

/** 文章：疊上請求語系的 title / summary / content；chosen 為 postId → translationId */
export async function localizePosts<T extends BaseRow>(rows: T[], locale: Locale) {
  const ids = rows.map((r) => r.id);
  const candidates = ids.length
    ? (
        await db
          .select({
            id: postTranslations.id,
            ownerId: postTranslations.postId,
            locale: postTranslations.locale,
            title: postTranslations.title,
            summary: postTranslations.summary,
            content: postTranslations.content,
            status: postTranslations.status,
            isSource: postTranslations.isSource,
            translatedBy: postTranslations.translatedBy,
          })
          .from(postTranslations)
          .where(
            and(
              inArray(postTranslations.postId, ids),
              or(eq(postTranslations.status, "published"), eq(postTranslations.isSource, true)),
            ),
          )
      ).map(({ status, ...c }) => ({ ...c, published: status === "published" }))
    : [];
  return overlay(rows, candidates, locale);
}

/** 日記：疊上請求語系的 title / content；chosen 為 noteId → translationId */
export async function localizeNotes<T extends BaseRow>(rows: T[], locale: Locale) {
  const ids = rows.map((r) => r.id);
  const candidates = ids.length
    ? (
        await db
          .select({
            id: noteTranslations.id,
            ownerId: noteTranslations.noteId,
            locale: noteTranslations.locale,
            title: noteTranslations.title,
            content: noteTranslations.content,
            status: noteTranslations.status,
            isSource: noteTranslations.isSource,
            translatedBy: noteTranslations.translatedBy,
          })
          .from(noteTranslations)
          .where(
            and(
              inArray(noteTranslations.noteId, ids),
              or(eq(noteTranslations.status, true), eq(noteTranslations.isSource, true)),
            ),
          )
      ).map(({ status, ...c }) => ({ ...c, summary: null, published: status }))
    : [];
  return overlay(rows, candidates, locale);
}

/** 只需要標題的列表（時間線、首頁、選單、專欄）：回傳 id → 該語系標題 */
export async function localizedTitles(
  type: "post" | "note",
  ids: string[],
  locale: Locale,
): Promise<Map<string, string>> {
  const rows = ids.map((id) => ({ id, title: "" }));
  const { items } = await (type === "post" ? localizePosts(rows, locale) : localizeNotes(rows, locale));
  return new Map(items.filter((i) => i.title).map((i) => [i.id, i.title]));
}

/** 分類名稱 / 描述：回傳 categoryId → 該語系翻譯（沒有翻譯的分類不在 Map 中，呼叫端沿用原文） */
export async function localizedCategories(
  ids: (string | null | undefined)[],
  locale: Locale,
): Promise<Map<string, { name: string; description: string | null }>> {
  const unique = [...new Set(ids.filter((id): id is string => !!id))];
  if (!unique.length) return new Map();
  const rows = await db
    .select({
      categoryId: categoryTranslations.categoryId,
      name: categoryTranslations.name,
      description: categoryTranslations.description,
    })
    .from(categoryTranslations)
    .where(and(inArray(categoryTranslations.categoryId, unique), eq(categoryTranslations.locale, locale)));
  return new Map(rows.map((r) => [r.categoryId, { name: r.name, description: r.description }]));
}

/**
 * 取得某個語言版本的編譯結果；compiled 為空或已過期（compiledHash ≠ 原文＋編譯管線版本的 hash）時
 * 重新編譯並回寫（lazy 重編：涵蓋遷移前的舊資料與編譯管線升版）。編譯失敗回傳 null，
 * 前端可自行退回編譯原文。
 */
export async function ensureCompiled(type: "post" | "note", translationId: string) {
  const table = type === "post" ? postTranslations : noteTranslations;
  const [row] = await db
    .select({
      content: table.content,
      compiled: table.compiled,
      toc: table.toc,
      readingTime: table.readingTime,
      compiledHash: table.compiledHash,
    })
    .from(table)
    .where(eq(table.id, translationId))
    .limit(1);
  if (!row) return null;

  const hash = await compiledHashOf(row.content);
  if (row.compiled && row.compiledHash === hash) {
    return { compiled: row.compiled as CompiledContent, toc: row.toc as TocItem[] | null, readingTime: row.readingTime };
  }

  const profile: CompileProfile = type;
  const result = await compileMdx(row.content, { profile, imageMeta: resolveImageMeta });
  if (!result.ok) return null;

  await db
    .update(table)
    .set({
      compiled: result.compiled,
      toc: result.toc,
      plainText: result.plainText,
      readingTime: result.readingTime,
      compiledHash: result.compiledHash,
    })
    .where(eq(table.id, translationId));

  return { compiled: result.compiled, toc: result.toc, readingTime: result.readingTime };
}
