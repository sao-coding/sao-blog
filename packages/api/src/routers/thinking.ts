import { publicProcedure } from "@sao-blog/api/index";
import { db } from "@sao-blog/db";
import { thinkings, notes } from "@sao-blog/db/schema/index";
import { eq, desc } from "drizzle-orm";
import z from "zod";

// 前台：取得已發表的想法列表（依時間倒序）
const getThinkings = publicProcedure
    .route({ method: "GET", path: "/thinkings" })
    .handler(async () => {
        const rows = await db
            .select({
                id: thinkings.id,
                content: thinkings.content,
                status: thinkings.status,
                noteId: thinkings.noteId,
                authorId: thinkings.authorId,
                createdAt: thinkings.createdAt,
                updatedAt: thinkings.updatedAt,
                noteTitle: notes.title,
            })
            .from(thinkings)
            .leftJoin(notes, eq(thinkings.noteId, notes.id))
            .where(eq(thinkings.status, true))
            .orderBy(desc(thinkings.createdAt));

        const data = rows.map(({ noteTitle, ...thinking }) => ({
            ...thinking,
            note:
                thinking.noteId && noteTitle
                    ? { id: thinking.noteId, title: noteTitle }
                    : null,
        }));

        return {
            status: "success",
            message: "想法列表取得成功",
            meta: { total: data.length },
            data,
        };
    });

// 前台：取得單一想法
const getThinking = publicProcedure
    .route({ method: "GET", path: "/thinkings/{id}" })
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
        const [row] = await db
            .select()
            .from(thinkings)
            .where(eq(thinkings.id, input.id))
            .limit(1);

        if (!row || !row.status) {
            return {
                status: "error",
                message: "想法不存在",
                data: null,
            };
        }

        return {
            status: "success",
            message: "想法取得成功",
            data: row,
        };
    });

export default {
    getThinkings,
    getThinking,
};
