import {
  categories,
  categoryTranslations,
  notes,
  noteTranslations,
  posts,
  postTags,
  postTranslations,
  tags,
} from "@sao-blog/db/schema/index";
import type * as schema from "@sao-blog/db/schema/index";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { and, eq, gte, inArray, or, type SQL } from "drizzle-orm";
import { mdxToText } from "../mdx-to-text";
import type { CollectionSchema, SearchClient } from "./client";
import { SEARCH_LOCALES, searchAlias, type SearchContentType, type SearchDocument, type SearchLocale } from "./query";

// 索引邏輯：從 DB 組出「已發布」的語言版本文件，同步到 Typesense。
// db / client 皆由呼叫端傳入（正式環境見 ./index.ts，測試用 PGlite + 假 client）。
//
// 規則：一篇內容的某語系「主表與該語系 translation 皆為已發布」才建立文件，否則刪除；
// 未翻譯的語系不建立 fallback 文件（避免搜尋結果重複）。

// 不綁定 driver：正式環境的 node-postgres 與測試的 PGlite 都是 PgDatabase
export type SearchDb = PgDatabase<PgQueryResultHKT, typeof schema>;
export interface SearchDeps {
  db: SearchDb;
  client: SearchClient;
}

/** 欄位層級的 locale：中、日文需指定才會用 ICU 斷詞 */
const TYPESENSE_FIELD_LOCALE: Record<SearchLocale, string | undefined> = {
  "zh-TW": "zh",
  en: undefined,
  ja: "ja",
};

export function collectionSchema(locale: SearchLocale, name: string): CollectionSchema {
  const text = (field: string, extra: Record<string, unknown> = {}) => ({
    name: field,
    type: "string",
    ...(TYPESENSE_FIELD_LOCALE[locale] ? { locale: TYPESENSE_FIELD_LOCALE[locale] } : {}),
    ...extra,
  });
  return {
    name,
    fields: [
      { name: "type", type: "string", facet: true },
      { name: "refId", type: "string" },
      { name: "locale", type: "string", facet: true },
      { name: "slug", type: "string", index: false, optional: true },
      text("title"),
      text("summary", { optional: true }),
      text("content"),
      { ...text("headings"), type: "string[]", optional: true },
      { name: "categoryId", type: "string", facet: true, optional: true },
      { name: "categoryName", type: "string", facet: true, optional: true },
      { name: "tags", type: "string[]", facet: true, optional: true },
      { name: "topicId", type: "string", facet: true, optional: true },
      { name: "cover", type: "string", index: false, optional: true },
      { name: "createdAt", type: "int64" },
      { name: "updatedAt", type: "int64" },
    ],
    default_sorting_field: "createdAt",
  };
}

const toUnix = (d: Date) => Math.floor(d.getTime() / 1000);
const docId = (type: SearchContentType, refId: string, locale: SearchLocale) => `${type}:${refId}:${locale}`;

async function plainTextOf(plainText: string | null, content: string) {
  if (plainText) return plainText;
  // PR2 回填的舊資料沒有編譯產物，退回即時轉純文字
  try {
    return await mdxToText(content);
  } catch {
    return content;
  }
}

function headingsOf(toc: unknown): string[] | undefined {
  if (!Array.isArray(toc)) return undefined;
  const values = toc.map((t) => (t as { value?: unknown }).value).filter((v): v is string => typeof v === "string");
  return values.length ? values : undefined;
}

/** 組出文章的可索引文件；ids 省略時為全部 */
export async function buildPostDocuments(db: SearchDb, ids?: string[]): Promise<SearchDocument[]> {
  if (ids && !ids.length) return [];
  const where: SQL[] = [eq(posts.status, "published"), eq(postTranslations.status, "published")];
  if (ids) where.push(inArray(posts.id, ids));
  const rows = await db
    .select({
      id: posts.id,
      slug: posts.slug,
      cover: posts.cover,
      categoryId: posts.categoryId,
      createdAt: posts.createdAt,
      locale: postTranslations.locale,
      title: postTranslations.title,
      summary: postTranslations.summary,
      content: postTranslations.content,
      plainText: postTranslations.plainText,
      toc: postTranslations.toc,
      updatedAt: postTranslations.updatedAt,
    })
    .from(posts)
    .innerJoin(postTranslations, eq(postTranslations.postId, posts.id))
    .where(and(...where));
  if (!rows.length) return [];

  const postIds = [...new Set(rows.map((r) => r.id))];
  const categoryIds = [...new Set(rows.map((r) => r.categoryId).filter((v): v is string => !!v))];
  const [tagRows, categoryRows, categoryNameRows] = await Promise.all([
    db
      .select({ postId: postTags.postId, name: tags.name })
      .from(postTags)
      .innerJoin(tags, eq(tags.id, postTags.tagId))
      .where(inArray(postTags.postId, postIds)),
    categoryIds.length
      ? db.select({ id: categories.id, name: categories.name }).from(categories).where(inArray(categories.id, categoryIds))
      : Promise.resolve([]),
    categoryIds.length
      ? db
          .select({ id: categoryTranslations.categoryId, locale: categoryTranslations.locale, name: categoryTranslations.name })
          .from(categoryTranslations)
          .where(inArray(categoryTranslations.categoryId, categoryIds))
      : Promise.resolve([]),
  ]);

  const tagsByPost = new Map<string, string[]>();
  for (const t of tagRows) tagsByPost.set(t.postId, [...(tagsByPost.get(t.postId) ?? []), t.name]);
  const categoryName = (id: string | null, locale: SearchLocale) =>
    id
      ? (categoryNameRows.find((c) => c.id === id && c.locale === locale)?.name ??
        categoryRows.find((c) => c.id === id)?.name)
      : undefined;

  return Promise.all(
    rows.map(async (r): Promise<SearchDocument> => {
      const postTagNames = tagsByPost.get(r.id);
      return {
        id: docId("post", r.id, r.locale),
        type: "post",
        refId: r.id,
        locale: r.locale,
        slug: r.slug,
        title: r.title,
        ...(r.summary ? { summary: r.summary } : {}),
        content: await plainTextOf(r.plainText, r.content),
        ...(headingsOf(r.toc) ? { headings: headingsOf(r.toc) } : {}),
        ...(r.categoryId ? { categoryId: r.categoryId } : {}),
        ...(categoryName(r.categoryId, r.locale) ? { categoryName: categoryName(r.categoryId, r.locale) } : {}),
        ...(postTagNames?.length ? { tags: postTagNames } : {}),
        ...(r.cover ? { cover: r.cover } : {}),
        createdAt: toUnix(r.createdAt),
        updatedAt: toUnix(r.updatedAt),
      };
    }),
  );
}

/** 組出日記的可索引文件；ids 省略時為全部 */
export async function buildNoteDocuments(db: SearchDb, ids?: string[]): Promise<SearchDocument[]> {
  if (ids && !ids.length) return [];
  const where: SQL[] = [eq(notes.status, true), eq(noteTranslations.status, true)];
  if (ids) where.push(inArray(notes.id, ids));
  const rows = await db
    .select({
      id: notes.id,
      topicId: notes.topicId,
      createdAt: notes.createdAt,
      locale: noteTranslations.locale,
      title: noteTranslations.title,
      content: noteTranslations.content,
      plainText: noteTranslations.plainText,
      toc: noteTranslations.toc,
      updatedAt: noteTranslations.updatedAt,
    })
    .from(notes)
    .innerJoin(noteTranslations, eq(noteTranslations.noteId, notes.id))
    .where(and(...where));

  return Promise.all(
    rows.map(async (r): Promise<SearchDocument> => ({
      id: docId("note", r.id, r.locale),
      type: "note",
      refId: r.id,
      locale: r.locale,
      slug: r.id,
      title: r.title,
      content: await plainTextOf(r.plainText, r.content),
      ...(headingsOf(r.toc) ? { headings: headingsOf(r.toc) } : {}),
      ...(r.topicId ? { topicId: r.topicId } : {}),
      createdAt: toUnix(r.createdAt),
      updatedAt: toUnix(r.updatedAt),
    })),
  );
}

const buildDocuments = (db: SearchDb, type: SearchContentType, ids?: string[]) =>
  type === "post" ? buildPostDocuments(db, ids) : buildNoteDocuments(db, ids);

const refIdFilter = (ids: string[]) => `refId:=[${ids.map((id) => `\`${id}\``).join(",")}]`;

// ─── 狀態（記憶體，給後台顯示；最後重建時間另由實體 collection 名稱的時間戳推得） ───

export interface SearchRuntimeStatus {
  lastSyncAt: string | null;
  lastSyncError: string | null;
  reindexing: boolean;
  lastReindex: { startedAt: string; finishedAt: string | null; ok: boolean; error: string | null; documents: number } | null;
}

export const runtimeStatus: SearchRuntimeStatus = {
  lastSyncAt: null,
  lastSyncError: null,
  reindexing: false,
  lastReindex: null,
};

let ensured = false;

/** 第一次寫入前確認各語系 alias 存在（尚未跑過 reindexAll 時自動建立空 collection） */
export async function ensureCollections(client: SearchClient) {
  if (ensured) return;
  for (const locale of SEARCH_LOCALES) {
    const alias = searchAlias(locale);
    if (await client.getAlias(alias)) continue;
    const name = `${alias}_${Date.now()}`;
    await client.createCollection(collectionSchema(locale, name));
    await client.upsertAlias(alias, name);
  }
  ensured = true;
}

/** 測試用：重設模組狀態 */
export function resetSearchState() {
  ensured = false;
  runtimeStatus.lastSyncAt = null;
  runtimeStatus.lastSyncError = null;
  runtimeStatus.reindexing = false;
  runtimeStatus.lastReindex = null;
}

/**
 * 依 DB 現況同步指定內容的所有語言版本：已發布 → upsert；否則 → 刪除。
 * 建立 / 更新 / 狀態變更 / 譯文增刪 / 內容刪除都呼叫這支（刪除後 DB 查不到 → 一律刪除文件）。
 * 失敗只記 log，不丟出（不可阻擋存檔），回傳是否成功。
 */
export async function syncContents(deps: SearchDeps, type: SearchContentType, ids: string[]): Promise<boolean> {
  if (!ids.length) return true;
  try {
    await ensureCollections(deps.client);
    const docs = await buildDocuments(deps.db, type, ids);
    for (const locale of SEARCH_LOCALES) {
      const alias = searchAlias(locale);
      const present = docs.filter((d) => d.locale === locale);
      const presentIds = new Set(present.map((d) => d.refId));
      const absent = ids.filter((id) => !presentIds.has(id));
      if (absent.length) await deps.client.deleteByFilter(alias, `type:=${type} && ${refIdFilter(absent)}`);
      if (present.length) {
        const { failed } = await deps.client.importDocuments(alias, present);
        if (failed) throw new Error(`${failed} 筆文件寫入失敗`);
      }
    }
    runtimeStatus.lastSyncAt = new Date().toISOString();
    runtimeStatus.lastSyncError = null;
    return true;
  } catch (error) {
    // 同步失敗不影響存檔；之後可在後台「重建索引」修補
    const message = error instanceof Error ? error.message : String(error);
    runtimeStatus.lastSyncError = `${new Date().toISOString()} ${type}:${ids.join(",")} ${message}`;
    console.error(`[search] 同步 ${type} ${ids.join(",")} 失敗:`, error);
    return false;
  }
}

/** 分類改名 / 譯名變更後，重新索引該分類下的文章 */
export async function syncCategoryPosts(deps: SearchDeps, categoryId: string): Promise<boolean> {
  try {
    const rows = await deps.db.select({ id: posts.id }).from(posts).where(eq(posts.categoryId, categoryId));
    return await syncContents(deps, "post", rows.map((r) => r.id));
  } catch (error) {
    console.error(`[search] 分類 ${categoryId} 重新索引失敗:`, error);
    return false;
  }
}

/**
 * 全量重建（零停機）：每語系建立新 collection → 寫入全部文件 → alias 指向新 collection → 刪除舊的。
 * 重建期間的寫入會進到舊 collection，所以切換後再補同步一次期間內有更新的內容。
 */
export async function reindexAll(deps: SearchDeps): Promise<{ documents: Record<SearchLocale, number> }> {
  if (runtimeStatus.reindexing) throw new Error("索引重建進行中");
  const started = new Date();
  runtimeStatus.reindexing = true;
  runtimeStatus.lastReindex = { startedAt: started.toISOString(), finishedAt: null, ok: false, error: null, documents: 0 };
  try {
    const docs = [...(await buildPostDocuments(deps.db)), ...(await buildNoteDocuments(deps.db))];
    const documents = { "zh-TW": 0, en: 0, ja: 0 } as Record<SearchLocale, number>;
    const stamp = started.getTime();

    for (const locale of SEARCH_LOCALES) {
      const alias = searchAlias(locale);
      const name = `${alias}_${stamp}`;
      const localeDocs = docs.filter((d) => d.locale === locale);
      await deps.client.createCollection(collectionSchema(locale, name));
      const { failed } = await deps.client.importDocuments(name, localeDocs);
      if (failed) {
        await deps.client.deleteCollection(name);
        throw new Error(`${locale}：${failed} 筆文件寫入失敗，未切換 alias`);
      }
      const previous = await deps.client.getAlias(alias);
      await deps.client.upsertAlias(alias, name);
      if (previous && previous !== name) await deps.client.deleteCollection(previous);
      documents[locale] = localeDocs.length;
    }
    ensured = true;

    // 補同步重建期間有變動的內容
    const [changedPosts, changedNotes] = await Promise.all([
      deps.db
        .selectDistinct({ id: postTranslations.postId })
        .from(postTranslations)
        .innerJoin(posts, eq(posts.id, postTranslations.postId))
        .where(or(gte(postTranslations.updatedAt, started), gte(posts.updatedAt, started))),
      deps.db
        .selectDistinct({ id: noteTranslations.noteId })
        .from(noteTranslations)
        .innerJoin(notes, eq(notes.id, noteTranslations.noteId))
        .where(or(gte(noteTranslations.updatedAt, started), gte(notes.updatedAt, started))),
    ]);
    await syncContents(deps, "post", changedPosts.map((r) => r.id));
    await syncContents(deps, "note", changedNotes.map((r) => r.id));

    runtimeStatus.lastReindex = {
      startedAt: started.toISOString(),
      finishedAt: new Date().toISOString(),
      ok: true,
      error: null,
      documents: docs.length,
    };
    return { documents };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    runtimeStatus.lastReindex = {
      startedAt: started.toISOString(),
      finishedAt: new Date().toISOString(),
      ok: false,
      error: message,
      documents: 0,
    };
    throw error;
  } finally {
    runtimeStatus.reindexing = false;
  }
}

export interface IndexStatus {
  locales: Array<{ locale: SearchLocale; collection: string | null; documents: number; builtAt: string | null }>;
}

/** 各語系 alias 指向的 collection、文件數與建立時間（由名稱的時間戳推得） */
export async function getIndexStatus(client: SearchClient): Promise<IndexStatus> {
  const locales = await Promise.all(
    SEARCH_LOCALES.map(async (locale) => {
      const collection = await client.getAlias(searchAlias(locale));
      const info = collection ? await client.getCollection(collection) : null;
      const stamp = Number(collection?.split("_").pop());
      return {
        locale,
        collection,
        documents: info?.numDocuments ?? 0,
        builtAt: Number.isFinite(stamp) && stamp > 0 ? new Date(stamp).toISOString() : null,
      };
    }),
  );
  return { locales };
}
