import { publicProcedure } from "@sao-blog/api/index";
import { db } from "@sao-blog/db";
import {
    posts,
    notes,
    categories,
    topics,
    thinkings,
} from "@sao-blog/db/schema/index";
import { eq, desc, sql } from "drizzle-orm";
import { mdxToExcerpt } from "../lib/mdx-to-text";
import { toIso } from "../lib/datetime";
import { MenuResponseSchema } from "../schema/menu";

const RECENT_POSTS_LIMIT = 5;
// 用於分類 hover 顯示：每分類最多顯示幾篇
const POSTS_PER_CATEGORY = 4;
// 一次撈取的文章數（涵蓋所有分類）
const CATEGORY_POSTS_POOL = 60;
const RECENT_NOTES_LIMIT = 4;
const RECENT_ACTIVITY_LIMIT = 4;
const RECENT_THINKINGS_LIMIT = 4;

// 導覽列 hover 卡片聚合資料
const getMenu = publicProcedure
    .route({ method: "GET", path: "/menu" })
    .output(MenuResponseSchema)
    .handler(async () => {
        const [
            postWords,
            noteWords,
            earliestRow,
            categoryRows,
            recentPostRows,
            categoryPostPoolRows,
            topicRows,
            recentNoteRows,
            recentActivityPostRows,
            recentActivityNoteRows,
            thinkingRows,
            totalPosts,
            totalNotes,
        ] = await Promise.all([
            // 字數統計：posts（published）內容總長度
            db
                .select({ total: sql<number>`coalesce(sum(char_length(${posts.content})), 0)` })
                .from(posts)
                .where(eq(posts.status, "published")),
            // 字數統計：notes（status=true）內容總長度
            db
                .select({ total: sql<number>`coalesce(sum(char_length(${notes.content})), 0)` })
                .from(notes)
                .where(eq(notes.status, true)),
            // 最早一篇文章建立時間（用來算經營天數）
            db
                .select({ createdAt: posts.createdAt })
                .from(posts)
                .where(eq(posts.status, "published"))
                .orderBy(posts.createdAt)
                .limit(1),
            // 分類（含篇數）
            db
                .select({
                    name: categories.name,
                    slug: categories.slug,
                    postCount: categories.postCount,
                })
                .from(categories)
                .orderBy(categories.sortOrder),
            // 近期文章（全部）
            db
                .select({
                    id: posts.id,
                    slug: posts.slug,
                    title: posts.title,
                    category: categories.name,
                    categorySlug: categories.slug,
                    createdAt: posts.createdAt,
                })
                .from(posts)
                .leftJoin(categories, eq(posts.categoryId, categories.id))
                .where(eq(posts.status, "published"))
                .orderBy(desc(posts.createdAt))
                .limit(RECENT_POSTS_LIMIT),
            // 分類 hover 用：撈取足夠多的文章，在 JS 端依分類分組
            db
                .select({
                    id: posts.id,
                    slug: posts.slug,
                    title: posts.title,
                    categorySlug: categories.slug,
                    createdAt: posts.createdAt,
                })
                .from(posts)
                .leftJoin(categories, eq(posts.categoryId, categories.id))
                .where(eq(posts.status, "published"))
                .orderBy(desc(posts.createdAt))
                .limit(CATEGORY_POSTS_POOL),
            // 專欄
            db
                .select({
                    id: topics.id,
                    name: topics.name,
                    slug: topics.slug,
                    color: topics.color,
                    noteCount: topics.noteCount,
                })
                .from(topics)
                .orderBy(desc(topics.noteCount)),
            // 近期手記
            db
                .select({
                    id: notes.id,
                    title: notes.title,
                    createdAt: notes.createdAt,
                })
                .from(notes)
                .where(eq(notes.status, true))
                .orderBy(desc(notes.createdAt))
                .limit(RECENT_NOTES_LIMIT),
            // 近期動態（文章）
            db
                .select({
                    id: posts.id,
                    slug: posts.slug,
                    title: posts.title,
                    createdAt: posts.createdAt,
                })
                .from(posts)
                .where(eq(posts.status, "published"))
                .orderBy(desc(posts.createdAt))
                .limit(RECENT_ACTIVITY_LIMIT),
            // 近期動態（日記）
            db
                .select({
                    id: notes.id,
                    title: notes.title,
                    createdAt: notes.createdAt,
                })
                .from(notes)
                .where(eq(notes.status, true))
                .orderBy(desc(notes.createdAt))
                .limit(RECENT_ACTIVITY_LIMIT),
            // 近期想法
            db
                .select({
                    id: thinkings.id,
                    content: thinkings.content,
                    createdAt: thinkings.createdAt,
                })
                .from(thinkings)
                .where(eq(thinkings.status, true))
                .orderBy(desc(thinkings.createdAt))
                .limit(RECENT_THINKINGS_LIMIT),
            db.$count(posts, eq(posts.status, "published")),
            db.$count(notes, eq(notes.status, true)),
        ]);

        const totalWords =
            Number(postWords[0]?.total ?? 0) + Number(noteWords[0]?.total ?? 0);
        const wordCountWan = Math.round(totalWords / 10000);

        const earliest = earliestRow[0]?.createdAt;
        const days = earliest
            ? Math.max(
                  1,
                  Math.floor(
                      (Date.now() - new Date(earliest).getTime()) /
                          (1000 * 60 * 60 * 24)
                  )
              )
            : 0;

        const recentActivity = [
            ...recentActivityPostRows.map((post) => ({
                id: String(post.id),
                title: post.title,
                href: `/posts/${post.slug}`,
                type: "post" as const,
                createdAt: toIso(post.createdAt),
            })),
            ...recentActivityNoteRows.map((note) => ({
                id: String(note.id),
                title: note.title,
                href: `/notes/${note.id}`,
                type: "note" as const,
                createdAt: toIso(note.createdAt),
            })),
        ]
            .sort(
                (a, b) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )
            .slice(0, RECENT_ACTIVITY_LIMIT);

        // 依分類分組，每組取前 POSTS_PER_CATEGORY 篇
        const postsByCategory: Record<string, { id: string; slug: string; title: string; createdAt: string }[]> = {};
        for (const row of categoryPostPoolRows) {
            const slug = row.categorySlug;
            if (!slug) continue;
            const bucket = postsByCategory[slug] ?? [];
            if (bucket.length < POSTS_PER_CATEGORY) {
                bucket.push({
                    id: String(row.id),
                    slug: row.slug,
                    title: row.title,
                    createdAt: toIso(row.createdAt),
                });
                postsByCategory[slug] = bucket;
            }
        }

        const recentThinkings = await Promise.all(
            thinkingRows.map(async (thinking) => ({
                id: String(thinking.id),
                content: await mdxToExcerpt(thinking.content, 80),
                createdAt: toIso(thinking.createdAt),
            }))
        );

        return {
            status: "success",
            message: "導覽列資料取得成功",
            data: {
                stats: {
                    writingCount: totalPosts,
                    wordCountWan,
                    days,
                },
                categories: categoryRows.map((c) => ({
                    name: c.name,
                    slug: c.slug,
                    postCount: c.postCount,
                })),
                recentPosts: recentPostRows.map((post) => ({
                    id: String(post.id),
                    slug: post.slug,
                    title: post.title,
                    category: post.category ?? null,
                    categorySlug: post.categorySlug ?? null,
                    createdAt: toIso(post.createdAt),
                })),
                postsByCategory,
                topics: topicRows.map((topic) => ({
                    id: String(topic.id),
                    name: topic.name,
                    slug: topic.slug,
                    color: topic.color ?? null,
                    noteCount: topic.noteCount,
                })),
                recentNotes: recentNoteRows.map((note) => ({
                    id: String(note.id),
                    title: note.title,
                    createdAt: toIso(note.createdAt),
                })),
                recentActivity,
                recentThinkings,
                postTotal: totalPosts,
                noteTotal: totalNotes,
            },
        };
    });

export default {
    getMenu,
};
