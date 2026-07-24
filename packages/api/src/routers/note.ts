import { publicProcedure } from "@sao-blog/api/index";
import { db } from "@sao-blog/db";
import { notes } from "@sao-blog/db/schema/index";
import { eq, desc, asc, and, lt, gt } from "drizzle-orm";
import z from "zod";
import { NoteLatestResponseSchema, NoteResponseSchema } from "../schema/note";
import { mdxToExcerpt } from "../lib/mdx-to-text";

// notes?id= 獲取日記列表（用於首頁或日記列表頁面）
// 註：此 procedure 會依是否帶 id 回傳兩種不同形狀（{current,list} 或陣列），
// 屬多型回應，故暫未加 .output()。建議後續拆成兩個獨立 procedure 再各自加 schema。
const getNotes = publicProcedure
    .route({ method: "GET", path: "/notes" })
    .input(z.object({
        id: z.string().optional(), // 可選的 id 參數，用於獲取特定日記的前後日記
    }))
    .handler(async ({ input }) => {
        // 取得目前日記 加上目前日記之前的 4 篇 跟 目前日記之後的 4 篇（如果有的話
        const noteId = input.id;

        // 如果沒有提供 id，則回傳最新一篇的完整內容，加上最新 9 篇的清單（用於日記首頁）
        if (!noteId) {
            const rows = await db
                .select({
                    id: notes.id,
                    title: notes.title,
                    createdAt: notes.createdAt,
                    mood: notes.mood,
                    bookmark: notes.bookmark,
                    content: notes.content,
                })
                .from(notes)
                .where(eq(notes.status, true))
                .orderBy(desc(notes.createdAt))
                .limit(9);

            // 清單只需要摘要，避免把完整內容傳到前端
            const list = await Promise.all(
                rows.map(async ({ content, ...rest }) => ({
                    ...rest,
                    excerpt: await mdxToExcerpt(content, 80),
                }))
            );

            const latestId = rows[0]?.id;
            const current = latestId
                ? (await db.select().from(notes).where(eq(notes.id, latestId)).limit(1))[0] ?? null
                : null;

            return {
                status: "success",
                message: "日記列表取得成功",
                data: {
                    current,
                    list,
                }
            }
        }
        // 1. 獲取當前日記
        const currentNote = await db
            .select({ createdAt: notes.createdAt })
            .from(notes)
            .where(and(eq(notes.id, noteId), eq(notes.status, true)))
            .limit(1);

        const  currentNoteCreatedAt = currentNote[0]!.createdAt;

        // 側邊時間軸只需要 id/title/createdAt，不需要完整內容與作者/主題關聯
        const listCols = { id: notes.id, title: notes.title, createdAt: notes.createdAt };

        // 2. 目前日記的前面 4 篇（較舊的日記）
        const prevNotesQuery = db
            .select(listCols)
            .from(notes)
            .where(
                and(
                    lt(notes.createdAt, currentNoteCreatedAt),
                    eq(notes.status, true)
                )
            )
            .orderBy(desc(notes.createdAt))
            .limit(4);

        // 3. 目前日記的後面 4 篇（較新的日記），依時間升冪排列（離目前最近的在前）
        const nextNotesQuery = db
            .select(listCols)
            .from(notes)
            .where(
                and(
                    gt(notes.createdAt, currentNoteCreatedAt),
                    eq(notes.status, true)
                )
            )
            .orderBy(asc(notes.createdAt))
            .limit(4);

        // 4. 目前日記本身
        const currentRowQuery = db
            .select(listCols)
            .from(notes)
            .where(and(eq(notes.id, noteId), eq(notes.status, true)))
            .limit(1);

        const [prevNotes, nextNotes, currentRows] = await Promise.all([
            prevNotesQuery,
            nextNotesQuery,
            currentRowQuery,
        ]);

        // 依時間由新到舊排列：較新的日記（反轉為新到舊）、目前日記、較舊的日記
        const list = [...nextNotes.slice().reverse(), ...currentRows, ...prevNotes];

        return {
            status: "success",
            message: "日記列表取得成功",
            data: list,
        }
    })

// /notes/latest
// 獲取最新日記的 ID（用於首頁重定向）

const getNoteLatest = publicProcedure
    .route({ method: "GET", path: "/notes/latest" })
    .output(NoteLatestResponseSchema)
    .handler(async () => {
        const note = await db
            .select()
            .from(notes)
            .where(eq(notes.status, true))
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
    .route({ method: "GET", path: "/notes/{id}" })
    .input(z.object({
        id: z.string(),
    }))
    .output(NoteResponseSchema)
    .handler(async ({ input }) => {
        const noteId = input.id;
        const note = await db
            .select()
            .from(notes)
            .where(and(eq(notes.id, noteId), eq(notes.status, true)))
            .limit(1);
        return {
            status: "success",
            message: "日記取得成功",
            data: note[0] ?? null,
        };
    });

// 取得所有已發布日記的 id（用於 generateStaticParams 建置期 SSG）
const getNoteIds = publicProcedure
    .route({ method: "GET", path: "/notes/ids" })
    .handler(async () => {
        const rows = await db
            .select({ id: notes.id })
            .from(notes)
            .where(eq(notes.status, true));

        return {
            status: "success",
            message: "日記 id 清單取得成功",
            data: rows,
        };
    });

export default {
    getNotes,
    getNoteLatest,
    getNote,
    getNoteIds,
}