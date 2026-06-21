import { protectedProcedure, publicProcedure } from "@sao-blog/api/index";
import { db } from "@sao-blog/db";
import { eq, desc, and, inArray, sql } from "drizzle-orm";
import { categories, posts, user, tags, postTags, type TagModel } from "@sao-blog/db/schema/index";
import z from "zod";
import { auth } from "@sao-blog/auth";
import { postInputSchema, PostResponseSchema, postSchema } from "@sao-blog/api/schema/post";
import { mdxToExcerpt } from "../../lib/mdx-to-text";
import { slugify } from "../../lib/slugify";

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
            .leftJoin(categories, eq(posts.categoryId, categories.id))
            .orderBy(desc(posts.updatedAt));

        return {
            status: "success",
            message: "文章列表取得成功",
            data: result,
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
        // 1) 先用 left join 取得 post、author、category（若有）
        const [row] = await db
            .select({ post: posts, author: user, category: categories })
            .from(posts)
            .innerJoin(user, eq(posts.authorId, user.id))
            .innerJoin(categories, eq(posts.categoryId, categories.id))
            .where(eq(posts.id, id))
            .limit(1);

        console.log(`Fetching post with id: ${id}`, row);
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

// 創建貼文
const createPost = protectedProcedure
    .route({ method: "POST", path: "/posts" })
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

        // summary 未填時，於儲存階段先從 content 產生純文字摘要，
        // 避免前台列表每次請求都即時解析 MDX
        const resolvedSummary =
            summary && summary.trim() ? summary : await mdxToExcerpt(content);

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
                categoryId: category?.id || null,
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

        // 建立標籤關聯
        if (tags && tags.length > 0) {
            const tagInserts = tags.map((t) => ({
                postId: createdPost.id,
                tagId: typeof t === 'string' ? t : t.id,
            }));
            await db.insert(postTags).values(tagInserts);
        }

        // 更新分類文章數量
        if (category?.id) {
            await db
                .update(categories)
                .set({ postCount: sql`${categories.postCount} + 1` })
                .where(eq(categories.id, category.id));
        }

        return {
            status: "success",
            message: "文章建立成功",
            data: createdPost,
        };
    });
// 更新貼文
const updatePost = protectedProcedure
    .route({ method: "PUT", path: "/posts/{id}" })
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

        // summary 未填時，於儲存階段先從 content 產生純文字摘要
        const resolvedSummary =
            summary && summary.trim() ? summary : await mdxToExcerpt(content);

        // 更新文章主資料
        const [updatedPost] = await db
            .update(posts)
            .set({
                slug: resolvedSlug,
                title,
                content,
                summary: resolvedSummary,
                categoryId: category?.id || null,
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
        const newCategoryId = category?.id ?? null;
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

        return {
            status: "success",
            message: "文章更新成功",
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
    deletePosts
};