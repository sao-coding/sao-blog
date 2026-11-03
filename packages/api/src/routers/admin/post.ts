import { protectedProcedure } from "@sao-blog/api/index";
import { db } from "@sao-blog/db";
import { eq, desc, inArray, sql } from "drizzle-orm";
import { categories, posts, user, tags, postTags, type TagModel } from "@sao-blog/db/schema/index";
import z from "zod";
import { postInputSchema, PostResponseSchema } from "@sao-blog/api/schema/post";
import { checkMdxForSave } from "../../lib/mdx-validate";
import { upsertSourcePostTranslation } from "../../lib/source-translation";
import { listTranslationStatus, postTranslationProcedures } from "./translation";
import { slugify } from "../../lib/slugify";
import { notifyBlogRevalidate } from "../../lib/notify-blog-revalidate";
import { queueSearchSync } from "../../lib/search";

// 管理員系統員系統

// 依標題產生 slug，並確保不與既有文章衝突（碰撞時補上序號）
async function generateUniqueSlugFromTitle(
    title: string,
    excludeId?: string
): Promise<string> {
    const base = slugify(title) || crypto.randomUUID().slice(0, 8);
    let candidate = base;
    let suffix = 1;

    while (true) {
        const existing = await db
            .select({ id: posts.id })
            .from(posts)
            .where(eq(posts.slug, candidate))
            .limit(1);

        const found = existing[0];
        if (!found || found.id === excludeId) return candidate;

        suffix += 1;
        candidate = `${base}-${suffix}`;
    }
}

const getPosts = protectedProcedure
    .route({ method: "GET", path: "/posts" })
    .handler(async () => {
        const result = await db
            .select({
                id: posts.id,
                title: posts.title,
                slug: posts.slug,
                cover: posts.cover,
                status: posts.status,
                createdAt: posts.createdAt,
                updatedAt: posts.updatedAt,
                author: {
                    id: user.id,
                    name: user.name,
                },
                category: {
                    id: categories.id,
                    name: categories.name,
                    color: categories.color,
                },
            })
            .from(posts)
            .innerJoin(user, eq(posts.authorId, user.id))
            .innerJoin(categories, eq(posts.categoryId, categories.id))
            .orderBy(desc(posts.updatedAt));

        // 各語言版本狀態（後台列表 badge；outdated = 原文改過、譯文待更新）
        const translations = await listTranslationStatus("post", result.map((r) => r.id));

        return {
            status: "success",
            message: "文章列表取得成功",
            data: result.map((r) => ({ ...r, translations: translations.get(r.id) ?? [] })),
        }
    });

const getPost = protectedProcedure
    .route({ method: "GET", path: "/posts/{id}" })
    .input(z.object({
        id: z.string(),
    }))
    .output(PostResponseSchema)
    .handler(async ({ input }) => {
        const { id } = input;
        // 1) 取得 post、author、category（分類為必填，每篇文章都有對應分類）
        const [row] = await db
            .select({ post: posts, author: user, category: categories })
            .from(posts)
            .innerJoin(user, eq(posts.authorId, user.id))
            .innerJoin(categories, eq(posts.categoryId, categories.id))
            .where(eq(posts.id, id))
            .limit(1);

        if (!row) {
            return {
                status: "error",
                message: "文章不存在",
                meta: undefined,
                data: null,
            };
        }

        // 2) 再查該 post 的 tags（透過 post_tags join tags）
        const tagRows = await db
            .select({ tag: tags })
            .from(postTags)
            .leftJoin(tags, eq(postTags.tagId, tags.id))
            .where(eq(postTags.postId, row.post.id));

        const tagsByPost = tagRows.map((tr) => tr.tag).filter((t): t is TagModel => t !== null);

        const { post, author, category } = row;

        return {
            status: "success",
            message: "文章取得成功",
            data: {
                ...post,
                author,
                category,
                tags: tagsByPost,
            },
        };
    });

// 解析文章分類 id：分類為必填，使用者未選擇時自動歸到 slug 為 "others" 的預設分類。
// 回傳 null 代表既沒選分類、也找不到預設「其他」分類（需先手動建立該分類）。
async function resolveCategoryId(categoryId?: string | null) {
    if (categoryId) return categoryId;

    const [fallback] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.slug, "others"))
        .limit(1);

    return fallback?.id ?? null;
}

// 創建貼文
const createPost = protectedProcedure
    .route({ method: "POST", path: "/posts", summary: "建立文章。content 為 MDX，存檔前以前台同一條管線驗證：發布狀態下有錯誤會被拒絕（錯誤含行號），草稿則可存但會回傳警告。建議先用 admin_content_previewMdx 驗證、用 admin_content_getComponents 查可用元件。 summary 未填會自動由內文產生。" })
    .input(postInputSchema)
    .handler(async ({ input, context }) => {
        const {
            slug,
            title,
            content,
            summary,
            category,
            tags,
            cover,
            allowComments,
            pin,
            pinOrder,
            status,
        } = input;

        // 取得當前登入使用者 ID
        const authorId = context.session.user.id;

        // 分類為必填：未選擇時自動歸到「其他」(slug=others) 預設分類
        const resolvedCategoryId = await resolveCategoryId(category?.id);
        if (!resolvedCategoryId) {
            return {
                status: "error",
                message: "未選擇分類，且找不到預設「其他」分類，請先建立 slug 為 others 的分類",
                meta: undefined,
                data: null,
            };
        }

        // 用前台同一條編譯管線驗證 MDX：發布時有錯誤直接拒絕存檔（錯誤帶行號）；
        // summary 未填時順便從編譯出的純文字產生摘要，避免前台列表每次請求都即時解析 MDX
        const mdx = await checkMdxForSave(content, {
            profile: "post",
            publish: status === "published",
            summary,
        });
        if (!mdx.ok) {
            return { status: "error", message: mdx.message, meta: undefined, data: null };
        }
        const resolvedSummary = mdx.summary;

        // slug 未填寫時，依標題自動產生；已填寫則檢查是否與既有文章衝突
        let resolvedSlug = slug?.trim();
        if (!resolvedSlug) {
            resolvedSlug = await generateUniqueSlugFromTitle(title);
        } else {
            const existing = await db
                .select()
                .from(posts)
                .where(eq(posts.slug, resolvedSlug))
                .limit(1);

            if (existing.length > 0) {
                return {
                    status: "error",
                    message: "文章 slug 已存在",
                    meta: undefined,
                    data: null,
                };
            }
        }

        // 建立文章
        const [createdPost] = await db
            .insert(posts)
            .values({
                slug: resolvedSlug,
                title,
                content,
                summary: resolvedSummary,
                authorId,
                categoryId: resolvedCategoryId,
                cover: cover ?? null,
                allowComments,
                pin,
                pinOrder,
                status,
            })
            .returning();

        if (!createdPost) {
            return {
                status: "error",
                message: "文章建立失敗",
                meta: undefined,
                data: null,
            };
        }

        await upsertSourcePostTranslation({
            postId: createdPost.id,
            locale: createdPost.defaultLocale,
            title,
            summary: resolvedSummary,
            content,
            status,
            artifacts: mdx.artifacts,
        });

        // 建立標籤關聯
        if (tags && tags.length > 0) {
            const tagInserts = tags.map((t) => ({
                postId: createdPost.id,
                tagId: typeof t === 'string' ? t : t.id,
            }));
            await db.insert(postTags).values(tagInserts);
        }

        // 更新分類文章數量
        await db
            .update(categories)
            .set({ postCount: sql`${categories.postCount} + 1` })
            .where(eq(categories.id, resolvedCategoryId));

        queueSearchSync("post", [createdPost.id]);
        await notifyBlogRevalidate(["/", "/posts", `/posts/${createdPost.slug}`]);

        return {
            status: "success",
            message: mdx.warning ? `文章建立成功。${mdx.warning}` : "文章建立成功",
            data: createdPost,
        };
    });
// 更新貼文
const updatePost = protectedProcedure
    .route({ method: "PUT", path: "/posts/{id}", summary: "更新文章。content 為 MDX，存檔前以前台同一條管線驗證：發布狀態下有錯誤會被拒絕（錯誤含行號），草稿則可存但會回傳警告。建議先用 admin_content_previewMdx 驗證、用 admin_content_getComponents 查可用元件。" })
    .input(postInputSchema)
    .handler(async ({ input }) => {
        const {
            id,
            slug,
            title,
            content,
            summary,
            category,
            tags,
            cover,
            allowComments,
            pin,
            pinOrder,
            status,
        } = input;

        // 取得文章目前的分類（用於後續計數調整）
        const [currentPost] = await db
            .select({ categoryId: posts.categoryId })
            .from(posts)
            .where(eq(posts.id, id!))
            .limit(1);

        if (!id) {
            return {
                status: "error",
                message: "文章 ID 不可為空",
                meta: undefined,
                data: null,
            };
        }

        // slug 未填寫時，依標題自動產生；已填寫則檢查是否被其他文章使用
        let resolvedSlug = slug?.trim();
        if (!resolvedSlug) {
            resolvedSlug = await generateUniqueSlugFromTitle(title, id);
        } else {
            const existing = await db
                .select()
                .from(posts)
                .where(eq(posts.slug, resolvedSlug))
                .limit(1);

            const existingPost = existing[0];
            if (existingPost && existingPost.id !== id) {
                return {
                    status: "error",
                    message: "文章 slug 已存在",
                    meta: undefined,
                    data: null,
                };
            }
        }

        // 驗證 MDX（規則同 createPost）
        const mdx = await checkMdxForSave(content, {
            profile: "post",
            publish: status === "published",
            summary,
        });
        if (!mdx.ok) {
            return { status: "error", message: mdx.message, meta: undefined, data: null };
        }
        const resolvedSummary = mdx.summary;

        // 分類為必填：未選擇時自動歸到「其他」(slug=others) 預設分類
        const resolvedCategoryId = await resolveCategoryId(category?.id);
        if (!resolvedCategoryId) {
            return {
                status: "error",
                message: "未選擇分類，且找不到預設「其他」分類，請先建立 slug 為 others 的分類",
                meta: undefined,
                data: null,
            };
        }

        // 更新文章主資料
        const [updatedPost] = await db
            .update(posts)
            .set({
                slug: resolvedSlug,
                title,
                content,
                summary: resolvedSummary,
                categoryId: resolvedCategoryId,
                cover: cover || null,
                allowComments,
                pin,
                pinOrder,
                status,
                updatedAt: new Date(),
            })
            .where(eq(posts.id, id))
            .returning();

        if (!updatedPost) {
            return {
                status: "error",
                message: "文章更新失敗",
                meta: undefined,
                data: null,
            };
        }

        await upsertSourcePostTranslation({
            postId: updatedPost.id,
            locale: updatedPost.defaultLocale,
            title,
            summary: resolvedSummary,
            content,
            status,
            artifacts: mdx.artifacts,
        });

        // 更新標籤關聯：先刪除再新增
        await db.delete(postTags).where(eq(postTags.postId, id));

        if (tags && tags.length > 0) {
            const tagInserts = tags.map((t: any) => ({
                postId: id,
                tagId: typeof t === 'string' ? t : t.id,
            }));
            await db.insert(postTags).values(tagInserts);
        }

        // 更新分類文章數量：舊分類 -1，新分類 +1
        const oldCategoryId = currentPost?.categoryId ?? null;
        const newCategoryId = resolvedCategoryId;
        if (oldCategoryId !== newCategoryId) {
            if (oldCategoryId) {
                await db
                    .update(categories)
                    .set({ postCount: sql`GREATEST(${categories.postCount} - 1, 0)` })
                    .where(eq(categories.id, oldCategoryId));
            }
            if (newCategoryId) {
                await db
                    .update(categories)
                    .set({ postCount: sql`${categories.postCount} + 1` })
                    .where(eq(categories.id, newCategoryId));
            }
        }

        queueSearchSync("post", [updatedPost.id]);
        await notifyBlogRevalidate(["/", "/posts", `/posts/${updatedPost.slug}`]);

        return {
            status: "success",
            message: mdx.warning ? `文章更新成功。${mdx.warning}` : "文章更新成功",
            data: updatedPost,
        };
    });

// 刪除貼文(要可以支援批量刪除)
const deletePosts = protectedProcedure
  .route({ method: "DELETE", path: "/posts" })
  .input(z.object({ ids: z.array(z.string()).min(1) }))
  .handler(async ({ input }) => {
    const { ids } = input;

    try {
      const deletedPosts = await db
        .delete(posts)
        .where(inArray(posts.id, ids))
        .returning();

      if (deletedPosts.length === 0) {
        return {
          status: "error",
          message: "找不到可刪除的文章",
          data: null,
        };
      }

      // 更新受影響分類的文章數量
      const categoryIds = [
        ...new Set(
          deletedPosts.map((p) => p.categoryId).filter((id): id is string => id !== null)
        ),
      ];
      for (const categoryId of categoryIds) {
        const count = deletedPosts.filter((p) => p.categoryId === categoryId).length;
        await db
          .update(categories)
          .set({ postCount: sql`GREATEST(${categories.postCount} - ${count}, 0)` })
          .where(eq(categories.id, categoryId));
      }

      queueSearchSync("post", deletedPosts.map((p) => p.id));
      await notifyBlogRevalidate([
        "/",
        "/posts",
        ...deletedPosts.map((p) => `/posts/${p.slug}`),
      ]);

      return {
        status: "success",
        message: "文章刪除成功",
        meta: {
          requested: ids.length,
          deleted: deletedPosts.length,
        },
        data: deletedPosts,
      };
    } catch (error) {
      console.error("刪除文章發生錯誤:", error);
      return {
        status: "error",
        message: "文章刪除發生錯誤",
        data: null,
      };
    }
  });

export default {
    getPosts,
    getPost,
    createPost,
    updatePost,
    deletePosts,
    ...postTranslationProcedures,
};