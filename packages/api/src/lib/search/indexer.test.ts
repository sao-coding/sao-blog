// bun test packages/api/src/lib/search
// 以 PGlite（套用 repo 的 migrations）+ 記憶體版 Typesense client 測試索引邏輯。
import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq, and } from "drizzle-orm";
import * as schema from "@sao-blog/db/schema/index";
import path from "node:path";
import { createTypesenseClient, type CollectionSchema, type SearchClient } from "./client";
import {
  collectionSchema,
  getIndexStatus,
  reindexAll,
  resetSearchState,
  runtimeStatus,
  syncCategoryPosts,
  syncContents,
  type SearchDb,
} from "./indexer";
import { parseSearchResponse, searchAlias, splitHighlight, type SearchDocument } from "./query";

const { posts, postTranslations, notes, noteTranslations, categories, categoryTranslations, tags, postTags } = schema;

// ─── 記憶體版 Typesense ──────────────────────────────────────────────────────

class FakeTypesense implements SearchClient {
  collections = new Map<string, { schema: CollectionSchema; docs: Map<string, SearchDocument> }>();
  aliases = new Map<string, string>();
  failNext = false;

  private resolve(name: string) {
    const c = this.collections.get(this.aliases.get(name) ?? name);
    if (!c) throw new Error(`collection ${name} not found`);
    return c;
  }
  private guard() {
    if (this.failNext) {
      this.failNext = false;
      throw new Error("typesense down");
    }
  }
  docs(locale: "zh-TW" | "en" | "ja") {
    return [...this.resolve(searchAlias(locale)).docs.values()];
  }

  async createCollection(s: CollectionSchema) {
    this.guard();
    this.collections.set(s.name, { schema: s, docs: new Map() });
  }
  async deleteCollection(name: string) {
    this.collections.delete(name);
  }
  async getCollection(name: string) {
    const c = this.collections.get(name);
    return c ? { name, numDocuments: c.docs.size } : null;
  }
  async getAlias(alias: string) {
    return this.aliases.get(alias) ?? null;
  }
  async upsertAlias(alias: string, collection: string) {
    this.aliases.set(alias, collection);
  }
  async importDocuments(collection: string, docs: SearchDocument[]) {
    this.guard();
    const c = this.resolve(collection);
    for (const d of docs) c.docs.set(d.id, d);
    return { failed: 0 };
  }
  async upsertDocument(collection: string, doc: SearchDocument) {
    this.resolve(collection).docs.set(doc.id, doc);
  }
  async deleteByFilter(collection: string, filterBy: string) {
    this.guard();
    // 只支援 indexer 用到的形式：type:=post && refId:=[`a`,`b`]
    const type = /type:=(\w+)/.exec(filterBy)?.[1];
    const ids = [...filterBy.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
    const c = this.resolve(collection);
    for (const [id, d] of c.docs) if (d.type === type && ids.includes(d.refId)) c.docs.delete(id);
  }
  async search(collection: string, query: { q: string }) {
    const hits = [...this.resolve(collection).docs.values()].filter(
      (d) => d.title.includes(query.q) || d.content.includes(query.q),
    );
    return { found: hits.length, page: 1, hits: hits.map((d) => ({ ...parseSearchResponse({ hits: [{ document: d }] }).hits[0]! })) };
  }
}

// ─── 測試資料 ────────────────────────────────────────────────────────────────

let db: SearchDb;
let fake: FakeTypesense;
const authorId = "00000000-0000-7000-8000-000000000001";

beforeAll(async () => {
  const pg = new PGlite();
  const d = drizzle(pg, { schema });
  await migrate(d, { migrationsFolder: path.resolve(import.meta.dir, "../../../../db/src/migrations") });
  db = d;
  // migrations 的 user 表欄位比 drizzle 定義多，直接以 SQL 補齊必要欄位
  await pg.query(
    `insert into "user" (id, name, email, email_verified, created_at, updated_at) values ($1, 'sao', 'sao@example.com', false, now(), now())`,
    [authorId],
  );
});

beforeEach(async () => {
  resetSearchState();
  fake = new FakeTypesense();
  await db.delete(posts);
  await db.delete(notes);
  await db.delete(categories);
  await db.delete(tags);
});

async function createPost(opts: { slug: string; status?: "draft" | "published"; categoryId?: string; plainText?: string | null }) {
  const [post] = await db
    .insert(posts)
    .values({
      slug: opts.slug,
      title: `原文 ${opts.slug}`,
      content: "# 標題\n\n內文",
      authorId,
      status: opts.status ?? "published",
      categoryId: opts.categoryId,
    })
    .returning();
  await db.insert(postTranslations).values({
    postId: post!.id,
    locale: "zh-TW",
    isSource: true,
    title: `繁中標題 ${opts.slug}`,
    summary: "摘要",
    content: "## 第一節\n\n繁體中文內文，搜尋測試。",
    plainText: opts.plainText === undefined ? "第一節 繁體中文內文，搜尋測試。" : opts.plainText,
    toc: [{ value: "第一節", depth: 2, href: "#第一節" }],
    status: opts.status ?? "published",
  });
  return post!;
}

const addPostTranslation = (postId: string, locale: "en" | "ja", status: "draft" | "published") =>
  db.insert(postTranslations).values({
    postId,
    locale,
    title: `${locale} title`,
    content: `${locale} body`,
    plainText: `${locale} body text`,
    status,
  });

const deps = () => ({ db, client: fake });

// ─── 測試 ────────────────────────────────────────────────────────────────────

describe("collection schema", () => {
  test("中、日文字串欄位設定 locale，英文不設定", () => {
    const field = (locale: "zh-TW" | "en" | "ja", name: string) =>
      collectionSchema(locale, "x").fields.find((f) => f.name === name);
    expect(field("zh-TW", "content")?.locale).toBe("zh");
    expect(field("ja", "title")?.locale).toBe("ja");
    expect(field("en", "title")?.locale).toBeUndefined();
    expect(field("ja", "headings")).toMatchObject({ type: "string[]", locale: "ja" });
    expect(field("zh-TW", "type")?.locale).toBeUndefined();
  });
});

describe("syncContents", () => {
  test("只索引主表與該語系皆已發布的版本，不建立 fallback", async () => {
    const post = await createPost({ slug: "hello" });
    await addPostTranslation(post.id, "en", "published");
    await addPostTranslation(post.id, "ja", "draft");

    expect(await syncContents(deps(), "post", [post.id])).toBe(true);

    expect(fake.docs("zh-TW")).toHaveLength(1);
    expect(fake.docs("zh-TW")[0]).toMatchObject({
      id: `post:${post.id}:zh-TW`,
      slug: "hello",
      title: "繁中標題 hello",
      headings: ["第一節"],
      content: "第一節 繁體中文內文，搜尋測試。",
    });
    expect(fake.docs("en").map((d) => d.title)).toEqual(["en title"]);
    expect(fake.docs("ja")).toHaveLength(0);
  });

  test("譯文下架 / 主表改草稿 / 刪除 → 移除文件", async () => {
    const post = await createPost({ slug: "toggle" });
    await addPostTranslation(post.id, "en", "published");
    await syncContents(deps(), "post", [post.id]);
    expect(fake.docs("en")).toHaveLength(1);

    await db
      .update(postTranslations)
      .set({ status: "draft" })
      .where(and(eq(postTranslations.postId, post.id), eq(postTranslations.locale, "en")));
    await syncContents(deps(), "post", [post.id]);
    expect(fake.docs("en")).toHaveLength(0);
    expect(fake.docs("zh-TW")).toHaveLength(1);

    await db.update(posts).set({ status: "draft" }).where(eq(posts.id, post.id));
    await syncContents(deps(), "post", [post.id]);
    expect(fake.docs("zh-TW")).toHaveLength(0);

    await db.update(posts).set({ status: "published" }).where(eq(posts.id, post.id));
    await syncContents(deps(), "post", [post.id]);
    expect(fake.docs("zh-TW")).toHaveLength(1);

    await db.delete(posts).where(eq(posts.id, post.id));
    await syncContents(deps(), "post", [post.id]);
    expect(fake.docs("zh-TW")).toHaveLength(0);
  });

  test("不影響其他內容與其他類型的文件", async () => {
    const a = await createPost({ slug: "a" });
    const b = await createPost({ slug: "b" });
    await syncContents(deps(), "post", [a.id, b.id]);
    await db.delete(posts).where(eq(posts.id, a.id));
    await syncContents(deps(), "post", [a.id]);
    expect(fake.docs("zh-TW").map((d) => d.slug)).toEqual(["b"]);
  });

  test("分類名依語系、標籤、封面", async () => {
    const [cat] = await db.insert(categories).values({ name: "程式", slug: "code" }).returning();
    await db.insert(categoryTranslations).values({ categoryId: cat!.id, locale: "en", name: "Programming" });
    const post = await createPost({ slug: "cat", categoryId: cat!.id });
    await addPostTranslation(post.id, "en", "published");
    await addPostTranslation(post.id, "ja", "published");
    const [tag] = await db.insert(tags).values({ name: "TypeScript", slug: "ts" }).returning();
    await db.insert(postTags).values({ postId: post.id, tagId: tag!.id });

    await syncContents(deps(), "post", [post.id]);
    expect(fake.docs("zh-TW")[0]).toMatchObject({ categoryName: "程式", tags: ["TypeScript"] });
    expect(fake.docs("en")[0]?.categoryName).toBe("Programming");
    // ja 沒有分類譯名 → 原文名
    expect(fake.docs("ja")[0]?.categoryName).toBe("程式");

    await db.update(categoryTranslations).set({ name: "Code" }).where(eq(categoryTranslations.categoryId, cat!.id));
    await syncCategoryPosts(deps(), cat!.id);
    expect(fake.docs("en")[0]?.categoryName).toBe("Code");
  });

  test("沒有 plainText（舊資料）時由 MDX 轉純文字", async () => {
    const post = await createPost({ slug: "legacy", plainText: null });
    await syncContents(deps(), "post", [post.id]);
    expect(fake.docs("zh-TW")[0]?.content).toContain("繁體中文內文");
    expect(fake.docs("zh-TW")[0]?.content).not.toContain("##");
  });

  test("日記：slug 為 id、需主表與譯文皆發布", async () => {
    const [note] = await db
      .insert(notes)
      .values({ title: "日記", mood: "happy", weather: "sunny", content: "x", authorId, status: true })
      .returning();
    await db.insert(noteTranslations).values([
      { noteId: note!.id, locale: "zh-TW", isSource: true, title: "今天", content: "晴天", plainText: "晴天", status: true },
      { noteId: note!.id, locale: "ja", title: "今日", content: "晴れ", plainText: "晴れ", status: false },
    ]);
    await syncContents(deps(), "note", [note!.id]);
    expect(fake.docs("zh-TW")[0]).toMatchObject({ type: "note", slug: note!.id, title: "今天" });
    expect(fake.docs("ja")).toHaveLength(0);
  });

  test("Typesense 失敗只記錄，不丟錯", async () => {
    const post = await createPost({ slug: "fail" });
    fake.failNext = true;
    const original = console.error;
    console.error = () => {};
    try {
      expect(await syncContents(deps(), "post", [post.id])).toBe(false);
    } finally {
      console.error = original;
    }
    expect(runtimeStatus.lastSyncError).toContain("typesense down");
  });
});

describe("reindexAll", () => {
  test("建立新 collection、切換 alias、刪除舊 collection", async () => {
    const post = await createPost({ slug: "r1" });
    await addPostTranslation(post.id, "en", "published");
    await createPost({ slug: "r2-draft", status: "draft" });

    await syncContents(deps(), "post", [post.id]); // 先有一組舊 collection
    const oldZh = fake.aliases.get(searchAlias("zh-TW"))!;

    await new Promise((r) => setTimeout(r, 5));
    const result = await reindexAll(deps());
    expect(result.documents).toEqual({ "zh-TW": 1, en: 1, ja: 0 });

    const newZh = fake.aliases.get(searchAlias("zh-TW"))!;
    expect(newZh).not.toBe(oldZh);
    expect(fake.collections.has(oldZh)).toBe(false);
    expect(fake.collections.size).toBe(3);
    expect(runtimeStatus.lastReindex).toMatchObject({ ok: true, documents: 2 });

    const status = await getIndexStatus(fake);
    expect(status.locales.find((l) => l.locale === "en")).toMatchObject({ documents: 1, collection: fake.aliases.get("contents_en") });
    expect(status.locales[0]?.builtAt).not.toBeNull();
  });

  test("重建期間的同步會雙寫新舊 collection", async () => {
    const post = await createPost({ slug: "dual" });
    await syncContents(deps(), "post", [post.id]);

    const targets: string[] = [];
    const importDocuments = fake.importDocuments.bind(fake);
    fake.importDocuments = async (collection, docs) => {
      targets.push(collection);
      return importDocuments(collection, docs);
    };
    // 三個新 collection 建好後（尚未切換 alias）模擬一次存檔同步
    const createCollection = fake.createCollection.bind(fake);
    let created = 0;
    fake.createCollection = async (s) => {
      await createCollection(s);
      if (++created === 3) {
        targets.length = 0;
        await syncContents(deps(), "post", [post.id]);
        expect(targets).toContain("contents_zh-TW");
        expect(targets).toContain(s.name.replace("contents_ja", "contents_zh-TW"));
      }
    };

    await new Promise((r) => setTimeout(r, 5));
    await reindexAll(deps());
    expect(created).toBe(3);
    expect(fake.docs("zh-TW").map((d) => d.slug)).toEqual(["dual"]);
  });

  test("寫入失敗時不切換 alias，並清掉新建的 collection", async () => {
    await createPost({ slug: "x" });
    await reindexAll(deps());
    const before = new Map(fake.aliases);
    fake.importDocuments = async () => ({ failed: 1 });
    await expect(reindexAll(deps())).rejects.toThrow("未切換 alias");
    expect(fake.aliases).toEqual(before);
    expect(fake.collections.size).toBe(3);
    expect(runtimeStatus.reindexing).toBe(false);
  });
});

describe("Typesense HTTP client", () => {
  test("查詢參數、alias 404 → null、import JSONL", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchMock = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (url.includes("/aliases/")) return new Response("not found", { status: 404 });
      if (url.includes("/import")) return new Response('{"success":true}\n{"success":false,"error":"bad"}');
      return Response.json({
        found: 1,
        page: 1,
        hits: [{ document: { id: "post:1:en", type: "post", refId: "1", locale: "en", slug: "s", title: "T" }, highlights: [{ field: "content", snippet: "a <mark>b</mark>" }] }],
      });
    }) as unknown as typeof fetch;
    const client = createTypesenseClient({ host: "ts.local", port: 8108, protocol: "http", apiKey: "k", fetch: fetchMock });

    expect(await client.getAlias("contents_en")).toBeNull();

    const result = await client.search("contents_en", { q: "b", type: "post" });
    const url = new URL(calls.at(-1)!.url);
    expect(url.pathname).toBe("/collections/contents_en/documents/search");
    expect(url.searchParams.get("query_by")).toBe("title,headings,summary,content");
    expect(url.searchParams.get("filter_by")).toBe("type:=post");
    expect((calls.at(-1)!.init!.headers as Record<string, string>)["X-TYPESENSE-API-KEY"]).toBe("k");
    expect(result.hits[0]).toMatchObject({ slug: "s", snippet: "a <mark>b</mark>" });

    const original = console.error;
    console.error = () => {};
    const imported = await client.importDocuments("c", [{ id: "1" } as SearchDocument, { id: "2" } as SearchDocument]);
    console.error = original;
    expect(imported.failed).toBe(1);
    expect(calls.at(-1)!.init!.body).toBe('{"id":"1"}\n{"id":"2"}');
  });

  test("splitHighlight 不解析 <mark> 以外的 HTML", () => {
    expect(splitHighlight("<b>x</b> <mark>hit</mark>!")).toEqual([
      { text: "<b>x</b> ", mark: false },
      { text: "hit", mark: true },
      { text: "!", mark: false },
    ]);
  });
});
