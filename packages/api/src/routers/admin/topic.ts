import { protectedProcedure, publicProcedure } from "@sao-blog/api/index";
import { db } from "@sao-blog/db";
import { eq, desc, and, inArray } from "drizzle-orm";
import { categories, posts, user, tags, postTags, type TagModel, topics } from "@sao-blog/db/schema/index";
import z from "zod";
import { auth } from "@sao-blog/auth";
import { topicSchema, topicInputSchema } from "@sao-blog/api/schema/topic";
import { notifyBlogRevalidate } from "../../lib/notify-blog-revalidate";

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

        if (!newTopic) {
            return {
                status: "error",
                message: "主題建立失敗",
                data: null,
            }
        }

        await notifyBlogRevalidate(["/notes/topics", `/notes/topics/${newTopic.slug}`]);

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

        const [currentTopic] = await db
            .select({ slug: topics.slug })
            .from(topics)
            .where(eq(topics.id, id))
            .limit(1);

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

        // slug 若被改掉，舊 slug 的快取頁面也要一併清掉，不然舊網址會停在最後
        // 一次快取內容（雖然理論上會 404，但快取還沒過期前仍會命中舊資料）。
        const slugsToRevalidate = new Set([updatedTopic.slug]);
        if (currentTopic?.slug) slugsToRevalidate.add(currentTopic.slug);
        await notifyBlogRevalidate([
            "/notes/topics",
            ...[...slugsToRevalidate].map((s) => `/notes/topics/${s}`),
        ]);

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

        await notifyBlogRevalidate(["/notes/topics", `/notes/topics/${deletedTopic.slug}`]);

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