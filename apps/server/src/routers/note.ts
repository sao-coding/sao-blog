import { publicProcedure } from "@/orpc/index";
import { db } from "@sao-blog/db";
import { notes } from "@sao-blog/db/schema/index";
import { eq, desc, asc, and, lt, gt } from "drizzle-orm";
import z from "zod";

// notes?id= 獲取日記列表（用於首頁或日記列表頁面）
const getNotes = publicProcedure
    .route({ method: "GET", path: "/notes" })
    .input(z.object({
        id: z.string().optional(), // 可選的 id 參數，用於獲取特定日記的前後日記
    }))
    .handler(async ({ input }) => {
        // 取得目前日記 加上目前日記之前的 4 篇 跟 目前日記之後的 4 篇（如果有的話
        const noteId = input.id;

        // 如果沒有提供 id，則回傳最新的 9 篇日記（包含最新的日記）
        if (!noteId) {
            const notesList = await db
                .select()
                .from(notes)
                .where(eq(notes.status, true))
                .orderBy(desc(notes.createdAt))
                .limit(9);
            return {
                status: "success",
                message: "日記列表取得成功",
                data: {
                    current: notesList[0] ?? null,
                    prev: notesList.slice(1, 5), // 最新日記之後的 4 篇
                    next: [], // 沒有更舊的日記了
                }
            }
        }
        // 1. 獲取當前日記
        const currentNote = await db
            .select()
            .from(notes)
            .where(and(eq(notes.id, noteId), eq(notes.status, true)))
            .limit(1);

        // 2. 目前日記的前面 4 篇（較舊的日記）
        const prevNotes = await db
            .select({ id: notes.id })
            .from(notes)
            .where(
                and(
                    lt(notes.createdAt, currentNote[0].createdAt),
                    eq(notes.status, true)
                )
            )
            .orderBy(desc(notes.createdAt))
            .limit(4);

        // 3. 目前日記的後面 4 篇（較新的日記）
        const nextNotes = await db
            .select({ id: notes.id })
            .from(notes)
            .where(
                and(
                    gt(notes.createdAt, currentNote[0].createdAt),
                    eq(notes.status, true)
                )
            )
            .orderBy(asc(notes.createdAt))
            .limit(4);
            
        return {
            status: "success",
            message: "日記列表取得成功",
            data: {
                current: currentNote[0],
                prev: prevNotes,
                next: nextNotes,
            }
               
            }
        };
    });

// /notes/latest
// 獲取最新日記的 ID（用於首頁重定向）

const getNoteLatest = publicProcedure
    .route({ method: "GET", path: "/notes/latest" })
    .handler(async () => {
        const note = await db
            .select()
            .from(notes)
            .orderBy(desc(notes.createdAt))
            .limit(1)
        
        return {
            status: "success",
            message: "最新日記取得成功",
            data: {
                id: note[0]?.id ?? null,
            }
        };
    });

// 獲取單篇日記的詳細內容（用於日記頁面）
const getNote = publicProcedure
    .route({ method: "GET", path: "/notes/:id" })
    .input(z.object({
        id: z.string(),
    }))
    .handler(async ({ input }) => {
        const noteId = input.id;
        const note = await db
            .select()
            .from(notes)
            .where(eq(notes.id, noteId))
            .limit(1);
        return {
            status: "success",
            message: "日記取得成功",
            data: note[0] ?? null,
        };
    });

export default {
    getNotes,
    getNoteLatest,
    getNote,
}