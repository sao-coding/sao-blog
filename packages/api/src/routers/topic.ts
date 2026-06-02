import { publicProcedure } from "@sao-blog/api/index";
import { db } from "@sao-blog/db";
import { notes, topics } from "@sao-blog/db/schema/index";
import { eq, desc } from "drizzle-orm";
import z from "zod";
import { toIso } from "../lib/datetime";
import { TopicListResponseSchema, TopicWithNotesResponseSchema } from "../schema/topic";

const getTopics = publicProcedure
    .route({ method: "GET", path: "/topics" })
    .output(TopicListResponseSchema)
    .handler(async () => {
        const result = await db
            .select()
            .from(topics)
            .orderBy(desc(topics.noteCount));

        return {
            status: "success",
            message: "專欄列表取得成功",
            data: result.map((t) => ({
                ...t,
                description: t.description ?? null,
                color: t.color ?? null,
                createdAt: toIso(t.createdAt),
                updatedAt: toIso(t.updatedAt),
            })),
        };
    });

const getTopicBySlug = publicProcedure
    .route({ method: "GET", path: "/topics/{slug}" })
    .input(z.object({ slug: z.string() }))
    .output(TopicWithNotesResponseSchema)
    .handler(async ({ input }) => {
        const [topic] = await db
            .select()
            .from(topics)
            .where(eq(topics.slug, input.slug))
            .limit(1);

        if (!topic) {
            return {
                status: "error",
                message: "專欄不存在",
                data: null,
            };
        }

        const noteRows = await db
            .select({
                id: notes.id,
                title: notes.title,
                mood: notes.mood,
                weather: notes.weather,
                createdAt: notes.createdAt,
                updatedAt: notes.updatedAt,
            })
            .from(notes)
            .where(eq(notes.topicId, topic.id))
            .orderBy(desc(notes.createdAt));

        return {
            status: "success",
            message: "專欄取得成功",
            data: {
                topic: {
                    ...topic,
                    description: topic.description ?? null,
                    color: topic.color ?? null,
                    createdAt: toIso(topic.createdAt),
                    updatedAt: toIso(topic.updatedAt),
                },
                notes: noteRows.map((n) => ({
                    id: n.id,
                    title: n.title,
                    mood: n.mood,
                    weather: n.weather,
                    createdAt: toIso(n.createdAt),
                    updatedAt: toIso(n.updatedAt),
                })),
            },
        };
    });

export default {
    getTopics,
    getTopicBySlug,
};
