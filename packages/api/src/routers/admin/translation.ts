import { protectedProcedure } from "@sao-blog/api/index";
import { db } from "@sao-blog/db";
import {
  categories,
  categoryTranslations,
  notes,
  noteTranslations,
  posts,
  postTranslations,
} from "@sao-blog/db/schema/index";
import { and, eq, inArray } from "drizzle-orm";
import z from "zod";
import { checkMdxForSave } from "../../lib/mdx-validate";
import { notifyBlogRevalidate } from "../../lib/notify-blog-revalidate";
import { localeSchema, type Locale } from "../../schema/i18n";

// 後台 / MCP 的翻譯管理。原文（isSource）一律透過 createPost / updatePost（日記同理）
// 編修，這裡只處理「非原文」的語言版本。
//
// outdated：譯文的 sourceHash（翻譯當下的原文 hash）≠ 原文目前的 hash → 原文改過，譯文需更新

const TRANSLATE_HINT =
  "翻譯 MDX 時：只翻譯文字與元件的可翻譯 props（見 admin_content_getComponents 的 translatableProps，" +
  "例如 Tab 的 label、Alert 的 title），元件名稱、其他 props、程式碼區塊、連結網址保持原樣。" +
  "content 與原文一樣會以前台編譯管線驗證：status 為發布時有錯誤會被拒絕。AI 翻譯請帶 translatedBy: 'ai'。";

type Status = { locale: Locale; status: string | boolean; isSource: boolean; translatedBy: "human" | "ai"; outdated: boolean };

/** 各內容的語言版本狀態（後台列表 badge 用） */
async function translationStatus(type: "post" | "note", ids: string[]): Promise<Map<string, Status[]>> {
  if (!ids.length) return new Map();
  const table = type === "post" ? postTranslations : noteTranslations;
  const ownerCol = type === "post" ? postTranslations.postId : noteTranslations.noteId;
  const rows = await db
    .select({
      ownerId: ownerCol,
      locale: table.locale,
      status: table.status,
      isSource: table.isSource,
      translatedBy: table.translatedBy,
      sourceHash: table.sourceHash,
    })
    .from(table)
    .where(inArray(ownerCol, ids));

  const sourceHash = new Map(rows.filter((r) => r.isSource).map((r) => [r.ownerId, r.sourceHash]));
  const result = new Map<string, Status[]>();
  for (const r of rows) {
    const list = result.get(r.ownerId) ?? [];
    list.push({
      locale: r.locale,
      status: r.status,
      isSource: r.isSource,
      translatedBy: r.translatedBy,
      outdated: !r.isSource && r.sourceHash !== sourceHash.get(r.ownerId),
    });
    result.set(r.ownerId, list);
  }
  return result;
}

export const listTranslationStatus = translationStatus;

// ─── 文章 ───────────────────────────────────────────────────────────────────

const getPostTranslations = protectedProcedure
  .route({
    method: "GET",
    path: "/posts/{postId}/translations",
    summary:
      "列出文章的所有語言版本（含原文 isSource）與內容；outdated: true 表示原文在翻譯後被修改過，譯文需要更新。",
  })
  .input(z.object({ postId: z.string() }))
  .handler(async ({ input }) => {
    const rows = await db
      .select({
        locale: postTranslations.locale,
        title: postTranslations.title,
        summary: postTranslations.summary,
        content: postTranslations.content,
        status: postTranslations.status,
        isSource: postTranslations.isSource,
        translatedBy: postTranslations.translatedBy,
        sourceHash: postTranslations.sourceHash,
        updatedAt: postTranslations.updatedAt,
      })
      .from(postTranslations)
      .where(eq(postTranslations.postId, input.postId));
    const source = rows.find((r) => r.isSource);
    return {
      status: "success",
      message: "文章語言版本取得成功",
      data: rows.map(({ sourceHash, ...r }) => ({
        ...r,
        outdated: !r.isSource && sourceHash !== source?.sourceHash,
      })),
    };
  });

const upsertPostTranslation = protectedProcedure
  .route({
    method: "PUT",
    path: "/posts/{postId}/translations/{locale}",
    summary: `新增或更新文章的某個語言版本（不可用於原文語系，原文請用 admin_post_updatePost）。${TRANSLATE_HINT}`,
  })
  .input(
    z.object({
      postId: z.string(),
      locale: localeSchema,
      title: z.string().min(1),
      summary: z.string().nullable().optional(),
      content: z.string().min(1),
      status: z.enum(["draft", "published", "archived"]),
      translatedBy: z.enum(["human", "ai"]).default("human"),
    }),
  )
  .handler(async ({ input }) => {
    const [post] = await db
      .select({ slug: posts.slug, defaultLocale: posts.defaultLocale })
      .from(posts)
      .where(eq(posts.id, input.postId))
      .limit(1);
    if (!post) return { status: "error", message: "文章不存在", data: null };
    if (input.locale === post.defaultLocale) {
      return { status: "error", message: "這是原文語系，請改用 updatePost 編修原文", data: null };
    }

    const [source] = await db
      .select({ sourceHash: postTranslations.sourceHash })
      .from(postTranslations)
      .where(and(eq(postTranslations.postId, input.postId), eq(postTranslations.isSource, true)))
      .limit(1);

    const mdx = await checkMdxForSave(input.content, {
      profile: "post",
      publish: input.status === "published",
      summary: input.summary,
    });
    if (!mdx.ok) return { status: "error", message: mdx.message, data: null };

    const values = {
      title: input.title,
      summary: mdx.summary,
      content: input.content,
      status: input.status,
      translatedBy: input.translatedBy,
      // 記下翻譯當下的原文版本，原文之後再改就會被標成 outdated
      sourceHash: source?.sourceHash ?? null,
      compiled: mdx.artifacts.compiled,
      toc: mdx.artifacts.toc,
      plainText: mdx.artifacts.plainText,
      readingTime: mdx.artifacts.readingTime,
      compiledHash: mdx.artifacts.compiledHash,
      updatedAt: new Date(),
    };
    const [row] = await db
      .insert(postTranslations)
      .values({ postId: input.postId, locale: input.locale, isSource: false, ...values })
      .onConflictDoUpdate({
        target: [postTranslations.postId, postTranslations.locale],
        set: values,
      })
      .returning({ locale: postTranslations.locale, status: postTranslations.status });

    await notifyBlogRevalidate(["/", "/posts", `/posts/${post.slug}`]);

    return {
      status: "success",
      message: mdx.warning ? `譯文已儲存。${mdx.warning}` : "譯文已儲存",
      data: row ?? null,
    };
  });

const deletePostTranslation = protectedProcedure
  .route({
    method: "DELETE",
    path: "/posts/{postId}/translations/{locale}",
    summary: "刪除文章的某個語言版本（原文不可刪）。",
  })
  .input(z.object({ postId: z.string(), locale: localeSchema }))
  .handler(async ({ input }) => {
    const deleted = await db
      .delete(postTranslations)
      .where(
        and(
          eq(postTranslations.postId, input.postId),
          eq(postTranslations.locale, input.locale),
          eq(postTranslations.isSource, false),
        ),
      )
      .returning({ locale: postTranslations.locale });
    if (!deleted.length) {
      return { status: "error", message: "找不到該語言版本，或它是原文（不可刪除）", data: null };
    }
    const [post] = await db.select({ slug: posts.slug }).from(posts).where(eq(posts.id, input.postId)).limit(1);
    if (post) await notifyBlogRevalidate(["/", "/posts", `/posts/${post.slug}`]);
    return { status: "success", message: "譯文已刪除", data: deleted[0] };
  });

// ─── 日記 ───────────────────────────────────────────────────────────────────

const getNoteTranslations = protectedProcedure
  .route({
    method: "GET",
    path: "/notes/{noteId}/translations",
    summary:
      "列出日記的所有語言版本（含原文 isSource）與內容；outdated: true 表示原文在翻譯後被修改過，譯文需要更新。",
  })
  .input(z.object({ noteId: z.string() }))
  .handler(async ({ input }) => {
    const rows = await db
      .select({
        locale: noteTranslations.locale,
        title: noteTranslations.title,
        content: noteTranslations.content,
        status: noteTranslations.status,
        isSource: noteTranslations.isSource,
        translatedBy: noteTranslations.translatedBy,
        sourceHash: noteTranslations.sourceHash,
        updatedAt: noteTranslations.updatedAt,
      })
      .from(noteTranslations)
      .where(eq(noteTranslations.noteId, input.noteId));
    const source = rows.find((r) => r.isSource);
    return {
      status: "success",
      message: "日記語言版本取得成功",
      data: rows.map(({ sourceHash, ...r }) => ({
        ...r,
        outdated: !r.isSource && sourceHash !== source?.sourceHash,
      })),
    };
  });

const upsertNoteTranslation = protectedProcedure
  .route({
    method: "PUT",
    path: "/notes/{noteId}/translations/{locale}",
    summary: `新增或更新日記的某個語言版本（status: true 為發布；不可用於原文語系，原文請用 admin_note_updateNote）。${TRANSLATE_HINT}`,
  })
  .input(
    z.object({
      noteId: z.string(),
      locale: localeSchema,
      title: z.string().min(1),
      content: z.string().min(1),
      status: z.boolean(),
      translatedBy: z.enum(["human", "ai"]).default("human"),
    }),
  )
  .handler(async ({ input }) => {
    const [note] = await db
      .select({ defaultLocale: notes.defaultLocale })
      .from(notes)
      .where(eq(notes.id, input.noteId))
      .limit(1);
    if (!note) return { status: "error", message: "日記不存在", data: null };
    if (input.locale === note.defaultLocale) {
      return { status: "error", message: "這是原文語系，請改用 updateNote 編修原文", data: null };
    }

    const [source] = await db
      .select({ sourceHash: noteTranslations.sourceHash })
      .from(noteTranslations)
      .where(and(eq(noteTranslations.noteId, input.noteId), eq(noteTranslations.isSource, true)))
      .limit(1);

    const mdx = await checkMdxForSave(input.content, { profile: "note", publish: input.status });
    if (!mdx.ok) return { status: "error", message: mdx.message, data: null };

    const values = {
      title: input.title,
      content: input.content,
      status: input.status,
      translatedBy: input.translatedBy,
      sourceHash: source?.sourceHash ?? null,
      compiled: mdx.artifacts.compiled,
      toc: mdx.artifacts.toc,
      plainText: mdx.artifacts.plainText,
      readingTime: mdx.artifacts.readingTime,
      compiledHash: mdx.artifacts.compiledHash,
      updatedAt: new Date(),
    };
    const [row] = await db
      .insert(noteTranslations)
      .values({ noteId: input.noteId, locale: input.locale, isSource: false, ...values })
      .onConflictDoUpdate({
        target: [noteTranslations.noteId, noteTranslations.locale],
        set: values,
      })
      .returning({ locale: noteTranslations.locale, status: noteTranslations.status });

    await notifyBlogRevalidate(["/notes", `/notes/${input.noteId}`]);

    return {
      status: "success",
      message: mdx.warning ? `譯文已儲存。${mdx.warning}` : "譯文已儲存",
      data: row ?? null,
    };
  });

const deleteNoteTranslation = protectedProcedure
  .route({
    method: "DELETE",
    path: "/notes/{noteId}/translations/{locale}",
    summary: "刪除日記的某個語言版本（原文不可刪）。",
  })
  .input(z.object({ noteId: z.string(), locale: localeSchema }))
  .handler(async ({ input }) => {
    const deleted = await db
      .delete(noteTranslations)
      .where(
        and(
          eq(noteTranslations.noteId, input.noteId),
          eq(noteTranslations.locale, input.locale),
          eq(noteTranslations.isSource, false),
        ),
      )
      .returning({ locale: noteTranslations.locale });
    if (!deleted.length) {
      return { status: "error", message: "找不到該語言版本，或它是原文（不可刪除）", data: null };
    }
    await notifyBlogRevalidate(["/notes", `/notes/${input.noteId}`]);
    return { status: "success", message: "譯文已刪除", data: deleted[0] };
  });

// ─── 分類 ───────────────────────────────────────────────────────────────────

const getCategoryTranslations = protectedProcedure
  .route({
    method: "GET",
    path: "/categories/{categoryId}/translations",
    summary: "列出分類名稱 / 描述的各語言版本。",
  })
  .input(z.object({ categoryId: z.string() }))
  .handler(async ({ input }) => ({
    status: "success",
    message: "分類語言版本取得成功",
    data: await db
      .select({
        locale: categoryTranslations.locale,
        name: categoryTranslations.name,
        description: categoryTranslations.description,
      })
      .from(categoryTranslations)
      .where(eq(categoryTranslations.categoryId, input.categoryId)),
  }));

const upsertCategoryTranslation = protectedProcedure
  .route({
    method: "PUT",
    path: "/categories/{categoryId}/translations/{locale}",
    summary: "新增或更新分類名稱 / 描述的某個語言版本（原文語系名稱請用 updateCategory 修改）。",
  })
  .input(
    z.object({
      categoryId: z.string(),
      locale: localeSchema,
      name: z.string().min(1).max(100),
      description: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ input }) => {
    const [category] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, input.categoryId))
      .limit(1);
    if (!category) return { status: "error", message: "分類不存在", data: null };

    const values = { name: input.name, description: input.description ?? null, updatedAt: new Date() };
    await db
      .insert(categoryTranslations)
      .values({ categoryId: input.categoryId, locale: input.locale, ...values })
      .onConflictDoUpdate({
        target: [categoryTranslations.categoryId, categoryTranslations.locale],
        set: values,
      });
    await notifyBlogRevalidate(["/", "/posts"]);
    return { status: "success", message: "分類譯名已儲存", data: { locale: input.locale, ...values } };
  });

export const postTranslationProcedures = {
  getPostTranslations,
  upsertPostTranslation,
  deletePostTranslation,
};

export const noteTranslationProcedures = {
  getNoteTranslations,
  upsertNoteTranslation,
  deleteNoteTranslation,
};

export const categoryTranslationProcedures = {
  getCategoryTranslations,
  upsertCategoryTranslation,
};
