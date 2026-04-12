import { protectedProcedure, publicProcedure } from "@sao-blog/api/index";
import { db } from "@sao-blog/db";
import { eq, desc, and, inArray } from "drizzle-orm";
import { categories, posts, user, tags, postTags, type TagModel, topics } from "@sao-blog/db/schema/index";
import z from "zod";
import { auth } from "@sao-blog/auth";
import { topicSchema, topicInputSchema } from "@sao-blog/api/schema/topic";

const getTopics = protectedProcedure
    .route({ method: "GET", path: "/topics" })
    .handler(async () => {
        const result = await db
            .select()
            .from(topics)
            .orderBy(desc(topics.createdAt));

        return {
            status: "success",
            message: "主題列表取得成功",
            data: result,
        }
    });

const getTopic = protectedProcedure
    .route({ method: "GET", path: "/topics/{id}" })
    .input(z.object({
        id: z.string(),
    }))
    .handler(async ({ input }) => {
        const { id } = input;
        const [row] = await db
            .select()
            .from(topics)
            .where(eq(topics.id, id))
            .limit(1);

        if (!row) {
            return {
                status: "error",
                message: "主題不存在",
                data: null,
            }
        }

        return {
            status: "success",
            message: "主題取得成功",
            data: row,
        }
    });

const createTopic = protectedProcedure
    .route({ method: "POST", path: "/topics" })
    .input(topicInputSchema)
    .handler(async ({ input }) => {
        const { name, slug, introduce, description, color } = input;

        const [newTopic] = await db
            .insert(topics)
            .values({
                name,
                slug,
                introduce,
                description,
                color,
            })
            .returning();

        return {
            status: "success",
            message: "主題建立成功",
            data: newTopic,
        }
    });

const updateTopic = protectedProcedure
    .route({ method: "PUT", path: "/topics/{id}" })
    .input(topicInputSchema)
    .handler(async ({ input }) => {
        const { id, name, slug, introduce, description, color } = input;

        const [updatedTopic] = await db
            .update(topics)
            .set({
                name,
                slug,
                introduce,
                description,
                color,
                updatedAt: new Date(),
            })
            .where(eq(topics.id, id))
            .returning();

        if (!updatedTopic) {
            return {
                status: "error",
                message: "主題不存在或更新失敗",
                data: null,
            }
        }

        return {
            status: "success",
            message: "主題更新成功",
            data: updatedTopic,
        }
    });

const deleteTopic = protectedProcedure
    .route({ method: "DELETE", path: "/topics/{id}" })
    .input(z.object({
        id: z.string(),
    }))
    .handler(async ({ input }) => {
        const { id } = input;

        const [deletedTopic] = await db
            .delete(topics)
            .where(eq(topics.id, id))
            .returning();

        if (!deletedTopic) {
            return {
                status: "error",
                message: "主題不存在或刪除失敗",
                data: null,
            }
        }

        return {
            status: "success",
            message: "主題刪除成功",
            data: null,
        }
    });

export default {
    getTopics,
    getTopic,
    createTopic,
    updateTopic,
    deleteTopic,
}