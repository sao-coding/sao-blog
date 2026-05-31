import { protectedProcedure } from "@sao-blog/api/index";
import { db } from "@sao-blog/db";
import { eq, desc, and, inArray } from "drizzle-orm";
import { thinkings } from "@sao-blog/db/schema/index";
import z from "zod";
import { thinkingInputSchema } from "@sao-blog/api/schema/thinking";

const getThinkings = protectedProcedure
    .route({ method: "GET", path: "/thinkings" })
    .handler(async () => {
        const result = await db
            .select()
            .from(thinkings)
            .orderBy(desc(thinkings.createdAt));

        return {
            status: "success",
            message: "想法列表取得成功",
            data: result,
        };
    });

const getThinking = protectedProcedure
    .route({ method: "GET", path: "/thinkings/{id}" })
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
        const [row] = await db
            .select()
            .from(thinkings)
            .where(eq(thinkings.id, input.id))
            .limit(1);

        if (!row) {
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

const createThinking = protectedProcedure
    .route({ method: "POST", path: "/thinkings" })
    .input(thinkingInputSchema)
    .handler(async ({ input, context }) => {
        const { content, status, noteId } = input;
        const authorId = context.session?.user.id;

        const [newThinking] = await db
            .insert(thinkings)
            .values({
                content,
                status,
                noteId,
                authorId,
            })
            .returning();

        if (!newThinking) {
            return {
                status: "error",
                message: "想法建立失敗",
                data: null,
            };
        }

        return {
            status: "success",
            message: "想法建立成功",
            data: newThinking,
        };
    });

const updateThinking = protectedProcedure
    .route({ method: "PUT", path: "/thinkings/{id}" })
    .input(thinkingInputSchema.merge(z.object({ id: z.string() })))
    .handler(async ({ input, context }) => {
        const { id, content, status, noteId } = input;
        const authorId = context.session?.user.id;

        const [updatedThinking] = await db
            .update(thinkings)
            .set({
                content,
                status,
                noteId,
                updatedAt: new Date(),
            })
            .where(and(eq(thinkings.id, id), eq(thinkings.authorId, authorId)))
            .returning();

        if (!updatedThinking) {
            return {
                status: "error",
                message: "想法更新失敗，可能是想法不存在或沒有權限",
                data: null,
            };
        }

        return {
            status: "success",
            message: "想法更新成功",
            data: updatedThinking,
        };
    });

// 可一次刪除多個想法
const deleteThinking = protectedProcedure
    .route({ method: "DELETE", path: "/thinkings" })
    .input(z.object({ ids: z.array(z.string()).min(1) }))
    .handler(async ({ input }) => {
        const { ids } = input;

        const deleted = await db
            .delete(thinkings)
            .where(inArray(thinkings.id, ids))
            .returning();

        if (deleted.length === 0) {
            return {
                status: "error",
                message: "沒有想法被刪除，可能是想法不存在",
                data: null,
            };
        }

        return {
            status: "success",
            message: "想法刪除成功",
            data: deleted,
        };
    });

export default {
    getThinkings,
    getThinking,
    createThinking,
    updateThinking,
    deleteThinking,
};
