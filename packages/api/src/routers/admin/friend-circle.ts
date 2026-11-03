import { adminProcedure } from "@sao-blog/api/index";
import { db } from "@sao-blog/db";
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { friendArticles, friends } from "@sao-blog/db/schema/index";
import z from "zod";
import { sanitizePublicUrl } from "@sao-blog/api/lib/friend-url";
import { invalidateFriendCircleJson } from "@sao-blog/api/lib/friend-circle";
import { backfillAccentColors } from "@sao-blog/api/lib/friend-accent";

// 給聚合器（GitHub Action）用，以 API Key 呼叫：
//   GET /api/admin/friend-circle/sources  讀要抓的站、條件請求標頭與摘要快取
//   PUT /api/admin/friend-circle/ingest   寫回抓取結果與文章

const getSources = adminProcedure
    .route({ method: "GET", path: "/friend-circle/sources" })
    .handler(async () => {
        const sources = await db
            .select({
                id: friends.id,
                name: friends.name,
                url: friends.url,
                feedUrl: friends.feedUrl,
                etag: friends.etag,
                lastModified: friends.lastModified,
            })
            .from(friends)
            .where(and(eq(friends.status, "approved"), eq(friends.circleEnabled, true)));

        // 已經有摘要的文章：聚合器用來判斷要不要再呼叫 AI（內容雜湊相同就沿用）
        const cached = sources.length
            ? await db
                .select({
                    link: friendArticles.link,
                    contentHash: friendArticles.contentHash,
                    summarySource: friendArticles.summarySource,
                })
                .from(friendArticles)
                .where(and(
                    inArray(friendArticles.friendId, sources.map((s) => s.id)),
                    sql`${friendArticles.summary} is not null`,
                ))
            : [];

        return {
            status: "success",
            message: "取得成功",
            data: { sources, cached },
        }
    });

const articleSchema = z.object({
    friendId: z.string(),
    link: z.string().max(1000),
    title: z.string().trim().min(1).max(300),
    publishedAt: z.iso.datetime({ offset: true }).nullable(),
    updatedAt: z.iso.datetime({ offset: true }).nullable(),
    summary: z.string().max(2000).nullable(),
    summarySource: z.enum(["ai", "feed", "none"]),
    summaryModel: z.string().max(100).nullable(),
    contentHash: z.string().max(64).nullable(),
});

const resultSchema = z.object({
    id: z.string(),
    fetchStatus: z.enum(["ok", "error", "not_modified"]),
    fetchError: z.string().max(1000).nullable(),
    etag: z.string().max(200).nullable(),
    lastModified: z.string().max(100).nullable(),
    /** 自動發現到的 feed 網址（原本沒填才寫入） */
    discoveredFeedUrl: z.string().max(500).nullable(),
});

const ingest = adminProcedure
    .route({ method: "PUT", path: "/friend-circle/ingest" })
    .input(z.object({
        results: z.array(resultSchema).max(1000),
        articles: z.array(articleSchema).max(10000),
        /** 每個站最多保留幾篇，超過的舊文章刪掉 */
        keepPerFriend: z.number().int().min(1).max(100).default(10),
    }))
    .handler(async ({ input }) => {
        const now = new Date();

        // 1. 每個站的抓取狀態
        for (const r of input.results) {
            const failed = r.fetchStatus === "error";
            const feedUrl = r.discoveredFeedUrl ? sanitizePublicUrl(r.discoveredFeedUrl) : null;
            await db
                .update(friends)
                .set({
                    fetchStatus: r.fetchStatus,
                    fetchError: failed ? r.fetchError : null,
                    failCount: failed ? sql`${friends.failCount} + 1` : 0,
                    lastFetchedAt: now,
                    // 失敗時保留上次的條件請求標頭
                    ...(failed ? {} : { etag: r.etag, lastModified: r.lastModified }),
                    ...(feedUrl ? { feedUrl: sql`coalesce(${friends.feedUrl}, ${feedUrl})` } : {}),
                })
                .where(eq(friends.id, r.id));
        }

        // 2. 文章 upsert（以 link 為鍵）；後台手動改過的摘要（manual）不覆蓋，
        //    這次沒有新摘要時也保留舊的
        const articles = input.articles
            .map((a) => ({ ...a, link: sanitizePublicUrl(a.link) }))
            .filter((a): a is typeof a & { link: string } => Boolean(a.link));

        for (const a of articles) {
            const values = {
                friendId: a.friendId,
                link: a.link,
                title: a.title,
                publishedAt: a.publishedAt ? new Date(a.publishedAt) : null,
                updatedAt: a.updatedAt ? new Date(a.updatedAt) : null,
                summary: a.summary,
                summarySource: a.summary ? a.summarySource : "none" as const,
                summaryModel: a.summaryModel,
                contentHash: a.contentHash,
            };
            await db
                .insert(friendArticles)
                .values(values)
                .onConflictDoUpdate({
                    target: friendArticles.link,
                    set: {
                        title: values.title,
                        publishedAt: values.publishedAt,
                        updatedAt: values.updatedAt,
                        contentHash: values.contentHash,
                        ...(values.summary
                            ? {
                                summary: sql`case when ${friendArticles.summarySource} = 'manual' then ${friendArticles.summary} else ${values.summary} end`,
                                summarySource: sql`case when ${friendArticles.summarySource} = 'manual' then ${friendArticles.summarySource} else ${values.summarySource}::summary_source end`,
                                summaryModel: sql`case when ${friendArticles.summarySource} = 'manual' then ${friendArticles.summaryModel} else ${values.summaryModel} end`,
                            }
                            : {}),
                    },
                });
        }

        // 3. 每個站只留最新 N 篇（只處理這次有抓到新資料的站）
        const touched = [...new Set(articles.map((a) => a.friendId))];
        let pruned = 0;
        for (const friendId of touched) {
            const keep = await db
                .select({ id: friendArticles.id })
                .from(friendArticles)
                .where(eq(friendArticles.friendId, friendId))
                .orderBy(sql`${friendArticles.publishedAt} desc nulls last`, sql`${friendArticles.firstSeenAt} desc`)
                .limit(input.keepPerFriend);
            if (keep.length < input.keepPerFriend) continue;
            const removed = await db
                .delete(friendArticles)
                .where(and(
                    eq(friendArticles.friendId, friendId),
                    notInArray(friendArticles.id, keep.map((k) => k.id)),
                ))
                .returning({ id: friendArticles.id });
            pruned += removed.length;
        }

        invalidateFriendCircleJson();
        // 順手補上舊友鏈還沒算過的卡片主色
        await backfillAccentColors();

        return {
            status: "success",
            message: `已更新 ${input.results.length} 個站、${articles.length} 篇文章，清掉 ${pruned} 篇舊文章`,
        }
    });

export default {
    getSources,
    ingest,
}
