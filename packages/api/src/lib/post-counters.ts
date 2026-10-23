import { db } from "@sao-blog/db";
import { categories, commentLikes, comments, notes, postTags, posts, tags, topics } from "@sao-blog/db/schema/index";
import { and, eq, inArray, sql } from "drizzle-orm";

// 文章留言數 = 已通過、未被隱藏的留言（含回覆）。
// 不做 +1 / -1，而是每次直接從 comments 重算，狀態怎麼切換都不會算歪，也不怕併發。
const visibleOfPost = (postId: ReturnType<typeof sql>) =>
    sql<number>`(select count(*)::int from ${comments}
        where ${comments.refId} = ${postId}
        and ${comments.refType} = 'post'
        and ${comments.status} = 'approved'
        and ${comments.deleted} = false)`;

/** 依留言 id 找出所屬的文章並重算留言數（留言異動後呼叫）。非文章留言會被略過。 */
export async function syncPostCommentCountByComments(commentIds: string[]) {
    if (commentIds.length === 0) return;
    const rows = await db
        .selectDistinct({ refId: comments.refId })
        .from(comments)
        .where(and(inArray(comments.id, commentIds), eq(comments.refType, "post")));
    await syncPostCommentCounts(rows.map((r) => r.refId));
}

export async function syncPostCommentCounts(postIds: string[]) {
    if (postIds.length === 0) return;
    await db
        .update(posts)
        .set({ commentCount: visibleOfPost(sql`${posts.id}`) })
        .where(inArray(posts.id, postIds));
}

// ── 全量重算 ─────────────────────────────────────────────────────────────
// 每一種「可由其他資料推算」的計數器都在這裡登記。閱讀數是純累加值，無從推算，不在此列。

export const COUNTER_TYPES = ["postComments", "commentReactions", "categoryPosts", "tagPosts", "topicNotes"] as const;
export type CounterType = (typeof COUNTER_TYPES)[number];
export type CounterResult = { type: CounterType; label: string; total: number; fixed: number };

const rowCount = async (table: typeof posts | typeof comments | typeof categories | typeof tags | typeof topics) =>
    (await db.select({ n: sql<number>`count(*)::int` }).from(table))[0]?.n ?? 0;

const recounters: Record<CounterType, { label: string; run: () => Promise<{ total: number; fixed: number }> }> = {
    postComments: {
        label: "文章留言數",
        run: async () => {
            const fixed = await db.update(posts)
                .set({ commentCount: visibleOfPost(sql`${posts.id}`) })
                .where(sql`${posts.commentCount} is distinct from ${visibleOfPost(sql`${posts.id}`)}`)
                .returning({ id: posts.id });
            return { total: await rowCount(posts), fixed: fixed.length };
        },
    },
    commentReactions: {
        label: "留言讚 / 踩數",
        run: async () => {
            const likes = sql<number>`(select count(*)::int from ${commentLikes} where ${commentLikes.commentId} = ${comments.id} and ${commentLikes.like} = true)`;
            const dislikes = sql<number>`(select count(*)::int from ${commentLikes} where ${commentLikes.commentId} = ${comments.id} and ${commentLikes.like} = false)`;
            const fixed = await db.update(comments)
                .set({ likes, dislikes })
                .where(sql`${comments.likes} is distinct from ${likes} or ${comments.dislikes} is distinct from ${dislikes}`)
                .returning({ id: comments.id });
            return { total: await rowCount(comments), fixed: fixed.length };
        },
    },
    categoryPosts: {
        label: "分類文章數",
        run: async () => {
            const n = sql<number>`(select count(*)::int from ${posts} where ${posts.categoryId} = ${categories.id} and ${posts.status} = 'published')`;
            const fixed = await db.update(categories).set({ postCount: n })
                .where(sql`${categories.postCount} is distinct from ${n}`).returning({ id: categories.id });
            return { total: await rowCount(categories), fixed: fixed.length };
        },
    },
    tagPosts: {
        label: "標籤文章數",
        run: async () => {
            const n = sql<number>`(select count(*)::int from ${postTags} join ${posts} on ${posts.id} = ${postTags.postId} where ${postTags.tagId} = ${tags.id} and ${posts.status} = 'published')`;
            const fixed = await db.update(tags).set({ postCount: n })
                .where(sql`${tags.postCount} is distinct from ${n}`).returning({ id: tags.id });
            return { total: await rowCount(tags), fixed: fixed.length };
        },
    },
    topicNotes: {
        label: "專欄日記數",
        run: async () => {
            const n = sql<number>`(select count(*)::int from ${notes} where ${notes.topicId} = ${topics.id} and ${notes.status} = true)`;
            const fixed = await db.update(topics).set({ noteCount: n })
                .where(sql`${topics.noteCount} is distinct from ${n}`).returning({ id: topics.id });
            return { total: await rowCount(topics), fixed: fixed.length };
        },
    },
};

/** 重算指定的計數器；"all" 為全部。 */
export async function recountCounters(type: CounterType | "all" = "all"): Promise<CounterResult[]> {
    const targets = type === "all" ? COUNTER_TYPES : [type];
    const results: CounterResult[] = [];
    for (const t of targets) results.push({ type: t, label: recounters[t].label, ...(await recounters[t].run()) });
    return results;
}
