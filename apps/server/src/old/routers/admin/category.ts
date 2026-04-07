import { protectedProcedure, publicProcedure } from "@/orpc/index";
import { db } from "@sao-blog/db";
import { eq, desc, and } from "drizzle-orm";
import { categories, posts, user, tags, postTags, type TagModel } from "@sao-blog/db/schema/index";
import z from "zod";
import { auth } from "@sao-blog/auth";

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
    .input(z.object({
        name: z.string(),
        slug: z.string(),
        description: z.string().nullable(),
        color: z.string().nullable()
    }))
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
    .input(z.object({
        id: z.string(),
        name: z.string(),
        slug: z.string(),
        description: z.string().nullable(),
        color: z.string().nullable()
    }))
    .handler(async ({ input }) => {
        const { id, name, slug, description, color } = input;
        const [row] = await db
            .update(categories)
            .set({
                name,
                slug,
                description,
                color,
            })
            .where(eq(categories.id, id))
            .returning();
    });


export default {
    getCategories,
    getCategory,
    createCategory,
    updateCategory
}