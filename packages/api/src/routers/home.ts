import { publicProcedure } from "@sao-blog/api/index";
import { db } from "@sao-blog/db";
import {
    posts,
    notes,
    categories,
    comments,
    thinkings,
} from "@sao-blog/db/schema/index";
import { eq, desc, and, gte } from "drizzle-orm";
import { mdxToExcerpt } from "../lib/mdx-to-text";
import { toIso } from "../lib/datetime";

const RECENT_WRITING_LIMIT = 6;
const MUSINGS_LIMIT = 4;
const LETTERS_LIMIT = 1;

// 前台首頁聚合資料
const getHome = publicProcedure
    .route({ method: "GET", path: "/home" })
    .handler(async () => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const startOfYear = new Date(currentYear, 0, 1);

        const [
            recentPostRows,
            recentNoteRows,
            timelinePostRows,
            timelineNoteRows,
            musingRows,
            letterRows,
            totalPosts,
            totalNotes,
            yearPosts,
            yearNotes,
            totalLetters,
        ] = await Promise.all([
            // 近期文章（含分類），僅取前 N 筆供「近期作品」使用
            db
                .select({
                    id: posts.id,
                    slug: posts.slug,
                    title: posts.title,
                    category: categories.name,
                    createdAt: posts.createdAt,
                })
                .from(posts)
                .leftJoin(categories, eq(posts.categoryId, categories.id))
                .where(eq(posts.status, "published"))
                .orderBy(desc(posts.createdAt))
                .limit(RECENT_WRITING_LIMIT),
            // 近期日記，僅取前 N 筆
            db
                .select({
                    id: notes.id,
                    title: notes.title,
                    weather: notes.weather,
                    createdAt: notes.createdAt,
                })
                .from(notes)
                .where(eq(notes.status, true))
                .orderBy(desc(notes.createdAt))
                .limit(RECENT_WRITING_LIMIT),
            // 時間軸需要所有作品，但只取繪製所需的最小欄位（不 join 分類）
            db
                .select({
                    id: posts.id,
                    slug: posts.slug,
                    title: posts.title,
                    createdAt: posts.createdAt,
                })
                .from(posts)
                .where(eq(posts.status, "published"))
                .orderBy(desc(posts.createdAt)),
            db
                .select({
                    id: notes.id,
                    title: notes.title,
                    createdAt: notes.createdAt,
                })
                .from(notes)
                .where(eq(notes.status, true))
                .orderBy(desc(notes.createdAt)),
            db
                .select({
                    id: thinkings.id,
                    content: thinkings.content,
                    noteId: thinkings.noteId,
                    createdAt: thinkings.createdAt,
                    noteTitle: notes.title,
                })
                .from(thinkings)
                .leftJoin(notes, eq(thinkings.noteId, notes.id))
                .where(eq(thinkings.status, true))
                .orderBy(desc(thinkings.createdAt))
                .limit(MUSINGS_LIMIT),
            db
                .select({
                    id: comments.id,
                    displayUsername: comments.displayUsername,
                    content: comments.content,
                    refType: comments.refType,
                    refId: comments.refId,
                    source: comments.source,
                    createdAt: comments.createdAt,
                })
                .from(comments)
                .where(eq(comments.deleted, false))
                .orderBy(desc(comments.createdAt))
                .limit(LETTERS_LIMIT),
            // 統計數量改用 SQL count，不再把整張表撈回來在 JS 計算
            db.$count(posts, eq(posts.status, "published")),
            db.$count(notes, eq(notes.status, true)),
            db.$count(
                posts,
                and(eq(posts.status, "published"), gte(posts.createdAt, startOfYear))
            ),
            db.$count(
                notes,
                and(eq(notes.status, true), gte(notes.createdAt, startOfYear))
            ),
            db.$count(comments, eq(comments.deleted, false)),
        ]);

        // 近期作品：合併文章與日記後取最新的 N 筆
        // （全域最新 N 筆必落在「各表最新 N 筆」的聯集內，故只需各取 N 筆）
        const recentWriting = [
            ...recentPostRows.map((post) => ({
                id: String(post.id),
                title: post.title,
                slug: post.slug,
                href: `/posts/${post.slug}`,
                type: "post" as const,
                category: post.category,
                weather: null as string | null,
                createdAt: toIso(post.createdAt),
            })),
            ...recentNoteRows.map((note) => ({
                id: String(note.id),
                title: note.title,
                slug: String(note.id),
                href: `/notes/${note.id}`,
                type: "note" as const,
                category: null as string | null,
                weather: note.weather,
                createdAt: toIso(note.createdAt),
            })),
        ]
            .sort(
                (a, b) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )
            .slice(0, RECENT_WRITING_LIMIT);

        // 時間軸涵蓋所有作品：從最早一篇到今天，確保每篇都有對應的點
        const timelineItems = [
            ...timelinePostRows.map((post) => ({
                id: String(post.id),
                title: post.title,
                href: `/posts/${post.slug}`,
                type: "post" as const,
                createdAt: toIso(post.createdAt),
            })),
            ...timelineNoteRows.map((note) => ({
                id: String(note.id),
                title: note.title,
                href: `/notes/${note.id}`,
                type: "note" as const,
                createdAt: toIso(note.createdAt),
            })),
        ].sort(
            (a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        // timelineItems 已由新到舊排序，最後一筆即最早的作品
        const earliest = timelineItems.at(-1);
        const windowStart = earliest
            ? new Date(earliest.createdAt)
            : (() => {
                  const d = new Date(now);
                  d.setFullYear(d.getFullYear() - 1);
                  return d;
              })();

        const musings = await Promise.all(
            musingRows.map(async ({ noteTitle, ...musing }) => ({
                ...musing,
                content: await mdxToExcerpt(musing.content, 100),
                createdAt: toIso(musing.createdAt),
                note:
                    musing.noteId && noteTitle
                        ? { id: musing.noteId, title: noteTitle }
                        : null,
            }))
        );

        const letters = letterRows.map((letter) => ({
            ...letter,
            createdAt: toIso(letter.createdAt),
        }));

        return {
            status: "success",
            message: "首頁資料取得成功",
            data: {
                recentWriting,
                musings,
                letters,
                timeline: {
                    windowStart: windowStart.toISOString(),
                    windowEnd: now.toISOString(),
                    yearTotal: yearPosts + yearNotes,
                    items: timelineItems,
                    latestTitle: timelineItems[0]?.title ?? null,
                    latestHref: timelineItems[0]?.href ?? null,
                },
                stats: {
                    totalWriting: totalPosts + totalNotes,
                    totalLetters,
                },
            },
        };
    });

export default {
    getHome,
};
