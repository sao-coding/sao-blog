import { adminProcedure } from "@sao-blog/api/index";
import { db } from "@sao-blog/db";
import { asc, count, desc, eq, inArray } from "drizzle-orm";
import { friends } from "@sao-blog/db/schema/index";
import z from "zod";
import { normalizeSiteUrl, sanitizePublicUrl } from "@sao-blog/api/lib/friend-url";

const friendStatusSchema = z.enum(["pending", "approved", "rejected", "hidden"]);

const friendInputSchema = z.object({
    name: z.string().trim().min(1).max(100),
    url: z.string().trim().min(1).max(500),
    avatar: z.string().trim().max(500).optional(),
    description: z.string().trim().max(200).optional(),
    email: z.string().trim().max(255).optional(),
    feedUrl: z.string().trim().max(500).optional(),
    backlinkUrl: z.string().trim().max(500).optional(),
    circleEnabled: z.boolean(),
    group: z.string().trim().min(1).max(50),
    sortOrder: z.number().int(),
    reviewNote: z.string().max(2000).optional(),
});

type FriendInput = z.infer<typeof friendInputSchema>;

/** 檢查並整理後台送來的欄位；回傳錯誤訊息或可直接寫入的值 */
function toFriendValues(input: FriendInput) {
    const url = normalizeSiteUrl(input.url);
    if (!url) return { error: "網站網址無效" } as const;
    const optionalUrl = (v?: string) => (v ? sanitizePublicUrl(v) : null);
    const avatar = optionalUrl(input.avatar);
    const feedUrl = optionalUrl(input.feedUrl);
    const backlinkUrl = optionalUrl(input.backlinkUrl);
    if (input.avatar && !avatar) return { error: "頭像網址無效" } as const;
    if (input.feedUrl && !feedUrl) return { error: "RSS 網址無效" } as const;
    if (input.backlinkUrl && !backlinkUrl) return { error: "友鏈頁網址無效" } as const;
    return {
        values: {
            name: input.name,
            url,
            avatar,
            description: input.description || null,
            email: input.email?.toLowerCase() || null,
            feedUrl,
            backlinkUrl,
            circleEnabled: input.circleEnabled,
            group: input.group,
            sortOrder: input.sortOrder,
            reviewNote: input.reviewNote || null,
        },
    } as const;
}

async function urlTaken(url: string, exceptId?: string) {
    const [row] = await db.select({ id: friends.id }).from(friends).where(eq(friends.url, url)).limit(1);
    return Boolean(row && row.id !== exceptId);
}

const getFriends = adminProcedure
    .route({ method: "GET", path: "/friends" })
    .input(z.object({ status: friendStatusSchema.optional() }))
    .handler(async ({ input }) => {
        const rows = await db
            .select()
            .from(friends)
            .where(input.status ? eq(friends.status, input.status) : undefined)
            .orderBy(asc(friends.group), asc(friends.sortOrder), desc(friends.createdAt));

        return {
            status: "success",
            message: "友鏈列表取得成功",
            data: rows,
        }
    });

const getStatusCounts = adminProcedure
    .route({ method: "GET", path: "/friends/status-counts" })
    .handler(async () => {
        const rows = await db
            .select({ status: friends.status, n: count() })
            .from(friends)
            .groupBy(friends.status);
        const data = { pending: 0, approved: 0, rejected: 0, hidden: 0 };
        for (const r of rows) data[r.status] = r.n;

        return {
            status: "success",
            message: "友鏈數量取得成功",
            data,
        }
    });

// 後台直接新增：視為已審核通過
const createFriend = adminProcedure
    .route({ method: "POST", path: "/friends" })
    .input(friendInputSchema)
    .handler(async ({ input, context }) => {
        const parsed = toFriendValues(input);
        if ("error" in parsed) return { status: "error", message: parsed.error, data: null }
        if (await urlTaken(parsed.values.url)) return { status: "error", message: "這個網站已經在名單中", data: null }

        const [row] = await db
            .insert(friends)
            .values({
                ...parsed.values,
                status: "approved",
                reviewedAt: new Date(),
                reviewedBy: context.session.user.id,
            })
            .returning();

        return {
            status: "success",
            message: "友鏈新增成功",
            data: row,
        }
    });

const updateFriend = adminProcedure
    .route({ method: "PUT", path: "/friends/{id}" })
    .input(friendInputSchema.extend({ id: z.string() }))
    .handler(async ({ input }) => {
        const parsed = toFriendValues(input);
        if ("error" in parsed) return { status: "error", message: parsed.error, data: null }
        if (await urlTaken(parsed.values.url, input.id)) return { status: "error", message: "這個網址已被其他友鏈使用", data: null }

        const [row] = await db
            .update(friends)
            .set({ ...parsed.values, updatedAt: new Date() })
            .where(eq(friends.id, input.id))
            .returning();

        return {
            status: "success",
            message: "友鏈更新成功",
            data: row,
        }
    });

// 審核 / 下架（可批次）；note 有給才覆寫備註
const setFriendStatus = adminProcedure
    .route({ method: "PATCH", path: "/friends/status" })
    .input(z.object({
        ids: z.array(z.string()).min(1).max(200),
        status: friendStatusSchema,
        note: z.string().max(2000).optional(),
    }))
    .handler(async ({ input, context }) => {
        const now = new Date();
        const rows = await db
            .update(friends)
            .set({
                status: input.status,
                reviewedAt: now,
                reviewedBy: context.session.user.id,
                updatedAt: now,
                ...(input.note !== undefined ? { reviewNote: input.note || null } : {}),
            })
            .where(inArray(friends.id, input.ids))
            .returning({ id: friends.id });

        return {
            status: "success",
            message: `已更新 ${rows.length} 個友鏈`,
        }
    });

const deleteFriends = adminProcedure
    .route({ method: "DELETE", path: "/friends" })
    .input(z.object({ ids: z.array(z.string()).min(1).max(200) }))
    .handler(async ({ input }) => {
        const rows = await db
            .delete(friends)
            .where(inArray(friends.id, input.ids))
            .returning({ id: friends.id });

        return {
            status: "success",
            message: `已刪除 ${rows.length} 個友鏈`,
        }
    });

export default {
    getFriends,
    getStatusCounts,
    createFriend,
    updateFriend,
    setFriendStatus,
    deleteFriends,
}
