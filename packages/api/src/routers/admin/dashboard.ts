import { protectedProcedure } from "@sao-blog/api/index";
import { db } from "@sao-blog/db";
import { gte, count, sql, desc, eq, gt, isNull } from "drizzle-orm";
import {
    posts,
    notes,
    comments,
    topics,
    categories,
    tags,
    user,
    session,
} from "@sao-blog/db/schema/index";

const TREND_DAYS = 14;

// 後台儀表板總覽：各項統計數量 + 近兩週留言趨勢 + 分布圖表 + 最新留言 + 使用者上線時間
const getOverview = protectedProcedure
    .route({ method: "GET", path: "/dashboard/overview" })
    .handler(async () => {
        const [
            postCount,
            noteCount,
            commentCount,
            topicCount,
            categoryCount,
            tagCount,
            uncategorizedPostCount,
        ] = await Promise.all([
            db.$count(posts),
            db.$count(notes),
            db.$count(comments),
            db.$count(topics),
            db.$count(categories),
            db.$count(tags),
            db.$count(posts, isNull(posts.categoryId)),
        ]);

        const since = new Date();
        since.setDate(since.getDate() - (TREND_DAYS - 1));
        since.setHours(0, 0, 0, 0);

        const [
            trendRows,
            categoryPostCounts,
            tagPostCounts,
            topicNoteCounts,
            recentCommentsRaw,
            recentUsersRaw,
        ] = await Promise.all([
            db
                .select({
                    date: sql<string>`to_char(${comments.createdAt}, 'YYYY-MM-DD')`,
                    value: count(),
                })
                .from(comments)
                .where(gte(comments.createdAt, since))
                .groupBy(sql`to_char(${comments.createdAt}, 'YYYY-MM-DD')`)
                .orderBy(sql`to_char(${comments.createdAt}, 'YYYY-MM-DD')`),

            db
                .select({
                    name: categories.name,
                    count: categories.postCount,
                    color: categories.color,
                })
                .from(categories)
                .where(gt(categories.postCount, 0))
                .orderBy(desc(categories.postCount))
                .limit(10),

            db
                .select({
                    name: tags.name,
                    count: tags.postCount,
                    color: tags.color,
                })
                .from(tags)
                .where(gt(tags.postCount, 0))
                .orderBy(desc(tags.postCount))
                .limit(10),

            db
                .select({
                    name: topics.name,
                    count: topics.noteCount,
                    color: topics.color,
                })
                .from(topics)
                .orderBy(desc(topics.noteCount))
                .limit(10),

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
                .limit(5),

            db
                .select({
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    image: user.image,
                    role: user.role,
                    lastOnlineAt: sql<Date | null>`max(${session.updatedAt})`,
                })
                .from(user)
                .leftJoin(session, eq(session.userId, user.id))
                .groupBy(user.id, user.name, user.email, user.image, user.role)
                .orderBy(sql`max(${session.updatedAt}) desc nulls last`)
                .limit(10),
        ]);

        const trendMap = new Map(
            trendRows.map((row) => [row.date, Number(row.value)])
        );

        // 補滿每一天，沒有留言的日期填 0，讓圖表連續
        const commentTrend = Array.from({ length: TREND_DAYS }, (_, i) => {
            const day = new Date(since);
            day.setDate(since.getDate() + i);
            const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
            return { date: key, count: trendMap.get(key) ?? 0 };
        });

        const recentComments = recentCommentsRaw.map((c) => ({
            ...c,
            content: c.content.length > 80 ? c.content.slice(0, 80) + "…" : c.content,
            createdAt: c.createdAt.toISOString(),
        }));

        const recentUsers = recentUsersRaw.map((u) => ({
            ...u,
            lastOnlineAt: u.lastOnlineAt
                ? (u.lastOnlineAt instanceof Date ? u.lastOnlineAt : new Date(u.lastOnlineAt)).toISOString()
                : null,
        }));

        return {
            status: "success",
            message: "儀表板資料取得成功",
            data: {
                counts: {
                    posts: postCount,
                    notes: noteCount,
                    comments: commentCount,
                    topics: topicCount,
                    categories: categoryCount,
                    tags: tagCount,
                    uncategorizedPosts: uncategorizedPostCount,
                },
                commentTrend,
                categoryPostCounts,
                tagPostCounts,
                topicNoteCounts,
                recentComments,
                recentUsers,
            },
        };
    });

export default {
    getOverview,
};
