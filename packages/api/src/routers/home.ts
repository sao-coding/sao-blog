import { publicProcedure } from "@sao-blog/api/index";
import { db } from "@sao-blog/db";
import {
    posts,
    notes,
    categories,
    comments,
    thinkings,
} from "@sao-blog/db/schema/index";
import { eq, desc } from "drizzle-orm";

const RECENT_WRITING_LIMIT = 5;
const MUSINGS_LIMIT = 4;
const LETTERS_LIMIT = 3;

const toIso = (value: Date | string) =>
    value instanceof Date ? value.toISOString() : new Date(value).toISOString();

// 前台首頁聚合資料
const getHome = publicProcedure
    .route({ method: "GET", path: "/home" })
    .handler(async () => {
        const [postRows, noteRows, musingRows, letterRows, totalLetters] =
            await Promise.all([
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
                .orderBy(desc(posts.createdAt)),
            db
                .select({
                    id: notes.id,
                    title: notes.title,
                    weather: notes.weather,
                    mood: notes.mood,
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
            db.$count(comments, eq(comments.deleted, false)),
        ]);

        // 合併文章與日記成統一的「筆墨」列表
        const writing = [
            ...postRows.map((post) => ({
                id: String(post.id),
                title: post.title,
                slug: post.slug,
                href: `/posts/${post.slug}`,
                type: "post" as const,
                category: post.category,
                weather: null as string | null,
                createdAt: toIso(post.createdAt),
            })),
            ...noteRows.map((note) => ({
                id: String(note.id),
                title: note.title,
                slug: String(note.id),
                href: `/notes/${note.id}`,
                type: "note" as const,
                category: null as string | null,
                weather: note.weather,
                createdAt: toIso(note.createdAt),
            })),
        ].sort(
            (a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        const now = new Date();
        const currentYear = now.getFullYear();

        // 本年（日曆年）篇數，用於「本年 N 篇」
        const yearTotal = writing.filter(
            (item) => new Date(item.createdAt).getFullYear() === currentYear
        ).length;

        // 時間軸顯示「滾動的近 12 個月」窗口（夏 → 秋 → 冬 → 春）
        const windowStart = new Date(now);
        windowStart.setFullYear(windowStart.getFullYear() - 1);
        const timelineItems = writing
            .filter((item) => new Date(item.createdAt) >= windowStart)
            .map((item) => ({
                id: item.id,
                title: item.title,
                href: item.href,
                type: item.type,
                createdAt: item.createdAt,
            }));

        const musings = musingRows.map(({ noteTitle, ...musing }) => ({
            ...musing,
            createdAt: toIso(musing.createdAt),
            note:
                musing.noteId && noteTitle
                    ? { id: musing.noteId, title: noteTitle }
                    : null,
        }));

        const letters = letterRows.map((letter) => ({
            ...letter,
            createdAt: toIso(letter.createdAt),
        }));

        return {
            status: "success",
            message: "首頁資料取得成功",
            data: {
                recentWriting: writing.slice(0, RECENT_WRITING_LIMIT),
                musings,
                letters,
                timeline: {
                    windowStart: windowStart.toISOString(),
                    windowEnd: now.toISOString(),
                    yearTotal,
                    items: timelineItems,
                    latestTitle: writing[0]?.title ?? null,
                    latestHref: writing[0]?.href ?? null,
                },
                stats: {
                    totalWriting: writing.length,
                    totalLetters,
                },
            },
        };
    });

export default {
    getHome,
};
