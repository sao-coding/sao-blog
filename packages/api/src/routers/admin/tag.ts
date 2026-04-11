import { protectedProcedure, publicProcedure } from "@sao-blog/api/index";
import { db } from "@sao-blog/db";
import { eq, desc, and } from "drizzle-orm";
import { categories, posts, user, tags, postTags, type TagModel } from "@sao-blog/db/schema/index";
import z from "zod";
import { auth } from "@sao-blog/auth";
import { tagInputSchema } from "@sao-blog/api/schema/tag";

const getTags = protectedProcedure
    .route({ method: "GET", path: "/tags" })
    .handler(async () => {
        const result = await db
            .select()
            .from(tags)
            .orderBy(desc(tags.createdAt));

        return {
            status: "success",
            message: "標籤列表取得成功",
            data: result,
        }
    });

const getTag = protectedProcedure
    .route({ method: "GET", path: "/tags/{id}" })
    .input(z.object({
        id: z.string(),
    }))
    .handler(async ({ input }) => {
        const { id } = input;
        const [row] = await db
            .select()
            .from(tags)
            .where(eq(tags.id, id))
            .limit(1);
        
        if (!row) {
            return {
                status: "error",
                message: "標籤不存在",
                data: null,
            }
        }

        return {
            status: "success",
            message: "標籤取得成功",
            data: row,
        }
    });

const createTag = protectedProcedure
    .route({ method: "POST", path: "/tags" })
    .input(tagInputSchema)
    .handler(async ({ input }) => {
        const { name, slug, description, color } = input;
        const id = crypto.randomUUID();

        const [row] = await db
            .insert(tags)
            .values({
                id,
                name,
                slug,
                description,
                color,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            .returning();

        return {
            status: "success",
            message: "標籤建立成功",
            data: row,
        }
    });

const updateTag = protectedProcedure
    .route({ method: "PUT", path: "/tags/{id}" })
    .input(tagInputSchema)
    .handler(async ({ input }) => {
        const { id, name, slug, description, color } = input;

        const [row] = await db
            .update(tags)
            .set({
                name,
                slug,
                description,
                color,
                updatedAt: new Date(),
            })
            .where(eq(tags.id, id))
            .returning();

        return {
            status: "success",
            message: "標籤更新成功",
            data: row,
        }
    });

const deleteTag = protectedProcedure
    .route({ method: "DELETE", path: "/tags/{id}" })
    .input(z.object({
        id: z.string(),
    }))
    .handler(async ({ input }) => {
        const { id } = input;
        const [row] = await db
            .delete(tags)
            .where(eq(tags.id, id))
            .returning();

        return {
            status: "success",
            message: "標籤刪除成功",
            data: row,
        }
    });

export default {
    getTags,
    getTag,
    createTag,
    updateTag,
    deleteTag
}