import { protectedProcedure } from "@sao-blog/api/index";
import { db } from "@sao-blog/db";
import { gte, count, sql } from "drizzle-orm";
import {
    posts,
    notes,
    comments,
    topics,
    categories,
    tags,
} from "@sao-blog/db/schema/index";

const TREND_DAYS = 14;

// 後台儀表板總覽：各項統計數量 + 近兩週留言趨勢
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
        ] = await Promise.all([
            db.$count(posts),
            db.$count(notes),
            db.$count(comments),
            db.$count(topics),
            db.$count(categories),
            db.$count(tags),
        ]);

        const since = new Date();
        since.setDate(since.getDate() - (TREND_DAYS - 1));
        since.setHours(0, 0, 0, 0);

        const trendRows = await db
            .select({
                date: sql<string>`to_char(${comments.createdAt}, 'YYYY-MM-DD')`,
                value: count(),
            })
            .from(comments)
            .where(gte(comments.createdAt, since))
            .groupBy(sql`to_char(${comments.createdAt}, 'YYYY-MM-DD')`)
            .orderBy(sql`to_char(${comments.createdAt}, 'YYYY-MM-DD')`);

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
                },
                commentTrend,
            },
        };
    });

export default {
    getOverview,
};
