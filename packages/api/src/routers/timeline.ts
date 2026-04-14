import { publicProcedure } from "@sao-blog/api/index";
import { db } from "@sao-blog/db";
import { categories, notes, posts } from "@sao-blog/db/schema/index";
import { eq } from "drizzle-orm";
import { TimelineInputSchema, TimelineResponseSchema } from "../schema/timeline";

const getTimeLine = publicProcedure
    .route({ method: "GET", path: "/timeline" })
    .input(TimelineInputSchema)
    .output(TimelineResponseSchema)
    .handler(async ({ input }) => {
        const includePosts = !input.type || input.type === "post";
        const includeNotes = !input.type || input.type === "note";

        const postRows = includePosts
            ? await db
                .select({
                    id: posts.id,
                    slug: posts.slug,
                    title: posts.title,
                    category: categories.name,
                    createdAt: posts.createdAt,
                    updatedAt: posts.updatedAt,
                })
                .from(posts)
                .leftJoin(categories, eq(posts.categoryId, categories.id))
            : [];

        const noteRows = includeNotes
            ? await db
                .select({
                    id: notes.id,
                    title: notes.title,
                    weather: notes.weather,
                    mood: notes.mood,
                    createdAt: notes.createdAt,
                    updatedAt: notes.updatedAt,
                })
                .from(notes)
            : [];

        const toIsoString = (value: Date | string) =>
            value instanceof Date ? value.toISOString() : new Date(value).toISOString();

        const timelineItems = [
            ...postRows.map((post) => ({
                id: String(post.id),
                title: post.title,
                slug: post.slug,
                type: "post" as const,
                category: post.category,
                weather: null,
                mood: null,
                createdAt: toIsoString(post.createdAt),
                updatedAt: toIsoString(post.updatedAt),
            })),
            ...noteRows.map((note) => ({
                id: String(note.id),
                title: note.title,
                slug: String(note.id),
                type: "note" as const,
                category: null,
                weather: note.weather,
                mood: note.mood,
                createdAt: toIsoString(note.createdAt),
                updatedAt: toIsoString(note.updatedAt),
            })),
        ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const groupedByYear = new Map<number, typeof timelineItems>();

        for (const item of timelineItems) {
            const year = new Date(item.createdAt).getFullYear();
            const items = groupedByYear.get(year) ?? [];
            items.push(item);
            groupedByYear.set(year, items);
        }

        const timeline = Array.from(groupedByYear.entries())
            .sort((a, b) => b[0] - a[0])
            .map(([year, items]) => ({
                year,
                count: items.length,
                items,
            }));

        // 計算數量
        const total = timeline.reduce((acc, group) => acc + group.count, 0);

        return {
            status: "success",
            message: "時間軸資料取得成功",
            meta: {
                total
            },
            data: timeline,
        };

    });

export default {
    getTimeLine,
};