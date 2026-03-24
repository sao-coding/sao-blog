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

export const adminCategoryRouter = {
    getCategories,
    getCategory,
}