import { protectedProcedure, publicProcedure } from "@sao-blog/api/index";
import { db } from "@sao-blog/db";
import { eq, desc, and, sql } from "drizzle-orm";
import { categories, posts, user, tags, postTags, type TagModel } from "@sao-blog/db/schema/index";
import z from "zod";
import { auth } from "@sao-blog/auth";
import { categoryInputSchema } from "@sao-blog/api/schema/category";

const getCategories = protectedProcedure
    .route({ method: "GET", path: "/categories" })
    .handler(async () => {
        const result = await db
            .select()
            .from(categories)
            .orderBy(desc(categories.createdAt));

        return {
            status: "success",
            message: "分類列表取得成功",
            data: result,
        }
    });

const getCategory = protectedProcedure
    .route({ method: "GET", path: "/categories/{id}" })
    .input(z.object({
        id: z.string(),
    }))
    .handler(async ({ input }) => {
        const { id } = input;
        const [row] = await db
            .select()
            .from(categories)
            .where(eq(categories.id, id))
            .limit(1);

        if (!row) {
            return {
                status: "error",
                message: "分類不存在",
                data: null,
            }
        }

        return {
            status: "success",
            message: "分類取得成功",
            data: row,
        }
    });

//     {
//   "status": "success",
//   "message": "分類取得成功",
//   "data": {
//     "id": "0199820a-b2b9-757c-a18a-3ef48e475707",
//     "name": "test",
//     "slug": "test",
//     "description": null,
//     "color": "#000000",
//     "parentId": null,
//     "sortOrder": 0,
//     "postCount": 0,
//     "createdAt": "2025-09-25T18:02:43.257Z",
//     "updatedAt": "2025-09-25T18:02:43.257Z"
//   }
// }
// 創建
const createCategory = protectedProcedure
    .route({ method: "POST", path: "/categories" })
    .input(categoryInputSchema)
    .handler(async ({ input }) => {
        const { name, slug, description, color } = input;
        const [row] = await db
            .insert(categories)
            .values({
                name,
                slug,
                description,
                color,
            })
            .returning();

        return {
            status: "success",
            message: "分類創建成功",
            data: row,
        }
    });

const updateCategory = protectedProcedure
    .route({ method: "PUT", path: "/categories/{id}" })
    .input(categoryInputSchema)
    .handler(async ({ input }) => {
        const { id, name, slug, description, color } = input;
        const [row] = await db
            .update(categories)
            .set({
                name,
                slug,
                description,
                color,
                updatedAt: new Date(),
            })
            .where(eq(categories.id, id))
            .returning();

        if (!row) {
            return {
                status: "error",
                message: "分類不存在或更新失敗",
                data: null,
            }
        }

        return {
            status: "success",
            message: "分類更新成功",
            data: row,
        }
    });

const deleteCategory = protectedProcedure
    .route({ method: "DELETE", path: "/categories/{id}" })
    .input(z.object({
        id: z.string(),
        // 若分類底下仍有文章，必須指定要轉移的目標分類
        targetCategoryId: z.string().optional(),
    }))
    .handler(async ({ input }) => {
        const { id, targetCategoryId } = input;

        // 確認分類存在
        const [category] = await db
            .select()
            .from(categories)
            .where(eq(categories.id, id))
            .limit(1);

        if (!category) {
            return {
                status: "error",
                message: "分類不存在",
                data: null,
            }
        }

        // 以實際資料為準計算分類底下的文章數量（不單純信任 postCount 欄位）
        const postsInCategory = await db
            .select({ id: posts.id })
            .from(posts)
            .where(eq(posts.categoryId, id));
        const postCount = postsInCategory.length;

        // 分類底下還有文章：禁止直接刪除，必須轉移到其他分類
        if (postCount > 0) {
            if (!targetCategoryId) {
                return {
                    status: "error",
                    message: `此分類底下還有 ${postCount} 篇文章，請先選擇要轉移的目標分類`,
                    data: null,
                }
            }

            if (targetCategoryId === id) {
                return {
                    status: "error",
                    message: "目標分類不可與要刪除的分類相同",
                    data: null,
                }
            }

            const [target] = await db
                .select()
                .from(categories)
                .where(eq(categories.id, targetCategoryId))
                .limit(1);

            if (!target) {
                return {
                    status: "error",
                    message: "目標分類不存在",
                    data: null,
                }
            }

            // 轉移文章 + 調整目標分類計數 + 刪除原分類，包在同一交易確保原子性
            const deleted = await db.transaction(async (tx) => {
                await tx
                    .update(posts)
                    .set({ categoryId: targetCategoryId, updatedAt: new Date() })
                    .where(eq(posts.categoryId, id));

                await tx
                    .update(categories)
                    .set({ postCount: sql`${categories.postCount} + ${postCount}` })
                    .where(eq(categories.id, targetCategoryId));

                const [row] = await tx
                    .delete(categories)
                    .where(eq(categories.id, id))
                    .returning();

                return row;
            });

            return {
                status: "success",
                message: `已將 ${postCount} 篇文章轉移至「${target.name}」並刪除分類`,
                data: deleted,
            }
        }

        // 沒有文章，直接刪除
        const [row] = await db
            .delete(categories)
            .where(eq(categories.id, id))
            .returning();

        return {
            status: "success",
            message: "分類刪除成功",
            data: row,
        }
    });


export default {
    getCategories,
    getCategory,
    createCategory,
    updateCategory,
    deleteCategory
}