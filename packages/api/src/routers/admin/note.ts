import { protectedProcedure } from "@sao-blog/api/index";
import { db } from "@sao-blog/db";
import { eq, desc, and, inArray } from "drizzle-orm";
import { categories, posts, user, tags, postTags, type TagModel, notes } from "@sao-blog/db/schema/index";
import z from "zod";
import { auth } from "@sao-blog/auth";
import { noteInputSchema } from "@sao-blog/api/schema/note";

const getNotes = protectedProcedure
    .route({ method: "GET", path: "/notes" })
    .handler(async () => {
        const result = await db
            .select()
            .from(notes)
            .orderBy(desc(notes.createdAt));

        return {
            status: "success",
            message: "筆記列表取得成功",
            data: result,
        }
    });

const getNote = protectedProcedure
    .route({ method: "GET", path: "/notes/{id}" })
    .input(z.object({
        id: z.string(),
    }))
    .handler(async ({ input }) => {
        const { id } = input;
        const [row] = await db
            .select()
            .from(notes)
            .where(eq(notes.id, id))
            .limit(1);

        if (!row) {
            return {
                status: "error",
                message: "筆記不存在",
                data: null,
            }
        }

        return {
            status: "success",
            message: "筆記取得成功",
            data: row,
        }
    });

const createNote = protectedProcedure
    .route({ method: "POST", path: "/notes" })
    .input(noteInputSchema)
    .handler(async ({ input, context }) => {
        // protectedProcedure 已經確保 context.session?.user 是存在的
        const { title, mood, weather, bookmark, coordinates, location, status, content, topicId } = input;
        const authorId = context.session?.user.id;

        const [newNote] = await db
            .insert(notes)
            .values({
                title,
                mood,
                weather,
                bookmark,
                coordinates,
                location,
                status,
                content,
                topicId,
                authorId,
            })
            .returning();

        if (!newNote) {
            return {
                status: "error",
                message: "筆記建立失敗",
                data: null,
            }
        }

        return {
            status: "success",
            message: "筆記建立成功",
            data: newNote,
        };
    });

const updateNote = protectedProcedure
    .route({ method: "PUT", path: "/notes/{id}" })
    .input(noteInputSchema.merge(z.object({ id: z.string() })))
    .handler(async ({ input, context }) => {
        const { id, title, mood, weather, bookmark, coordinates, location, status, content, topicId } = input;
        const authorId = context.session?.user.id;

        const [updatedNote] = await db
            .update(notes)
            .set({
                title,
                mood,
                weather,
                bookmark,
                coordinates,
                location,
                status,
                content,
                topicId,
            })
            .where(and(eq(notes.id, id), eq(notes.authorId, authorId)))
            .returning();

        if (!updatedNote) {
            return {
                status: "error",
                message: "筆記更新失敗，可能是筆記不存在或沒有權限",
                data: null,
            }
        }

        return {
            status: "success",
            message: "筆記更新成功",
            data: updatedNote,
        };
    });

// 可以一次刪除多個筆記
const deleteNote = protectedProcedure
    .route({ method: "DELETE", path: "/notes" })
    .input(z.object({ ids: z.array(z.string()).min(1) }))
    .handler(async ({ input }) => {
        const { ids } = input;

        try {
            const deleteNotes = await db
                .delete(notes)
                .where(inArray(notes.id, ids))
                .returning();

            if (deleteNotes.length === 0) {
                return {
                    status: "error",
                    message: "沒有筆記被刪除，可能是筆記不存在或沒有權限",
                    data: null,
                }
            }

            return {
                status: "success",
                message: "筆記刪除成功",
                data: deleteNotes,
            };
        } catch (error) {
            console.error("刪除筆記失敗:", error);
            return {
                status: "error",
                message: "刪除筆記失敗，請稍後再試",
                data: null,
            };
        }
    });

export default {
    getNotes,
    getNote,
    createNote,
    updateNote,
    deleteNote
}
