import { protectedProcedure } from "@sao-blog/api/index";
import { db } from "@sao-blog/db";
import { and, count, desc, eq, inArray, type SQL } from "drizzle-orm";
import { commentBlocklist, comments } from "@sao-blog/db/schema/index";
import z from "zod";
import { resolveIpLocation } from "@sao-blog/api/lib/geoip";

const STATUS = z.enum(["pending", "approved", "spam", "rejected"]);

// 取得留言（後台管理用）：可依審核狀態、留言者篩選
const getComments = protectedProcedure
    .route({ method: "GET", path: "/comments" })
    .input(z.object({
        status: STATUS.optional(),
        userId: z.string().optional(),
    }).optional())
    .handler(async ({ input }) => {
        const filters: SQL[] = [];
        if (input?.status) filters.push(eq(comments.status, input.status));
        if (input?.userId) filters.push(eq(comments.userId, input.userId));

        const result = await db
            .select()
            .from(comments)
            .where(filters.length ? and(...filters) : undefined)
            .orderBy(desc(comments.createdAt));

        return {
            status: "success",
            message: "留言列表取得成功",
            data: result,
        }
    });

// 各審核狀態的數量（留言頁分頁籤與儀表板「待審」用）
const getStatusCounts = protectedProcedure
    .route({ method: "GET", path: "/comments/status-counts" })
    .handler(async () => {
        const rows = await db
            .select({ status: comments.status, n: count() })
            .from(comments)
            .groupBy(comments.status);
        const counts = { pending: 0, approved: 0, spam: 0, rejected: 0 };
        for (const row of rows) counts[row.status] = row.n;
        return { status: "success", message: "取得成功", data: counts };
    });

// 取得單一留言
const getComment = protectedProcedure
    .route({ method: "GET", path: "/comments/{id}" })
    .input(z.object({
        id: z.string(),
    }))
    .handler(async ({ input }) => {
        const [row] = await db
            .select()
            .from(comments)
            .where(eq(comments.id, input.id))
            .limit(1);

        if (!row) {
            return { status: "error", message: "留言不存在", data: null }
        }
        return { status: "success", message: "留言取得成功", data: row }
    });

// 審核：批次設定狀態（通過 / 垃圾 / 拒絕 / 退回待審）
const setCommentStatus = protectedProcedure
    .route({ method: "PUT", path: "/comments/status" })
    .input(z.object({
        ids: z.array(z.string()).min(1).max(500),
        status: STATUS,
    }))
    .handler(async ({ input, context }) => {
        const rows = await db
            .update(comments)
            .set({
                status: input.status,
                moderatedAt: new Date(),
                moderatedBy: context.session.user.id,
                updatedAt: new Date(),
            })
            .where(inArray(comments.id, input.ids))
            .returning({ id: comments.id });

        const label = { pending: "退回待審", approved: "通過", spam: "標為垃圾", rejected: "拒絕" }[input.status];
        return { status: "success", message: `已${label} ${rows.length} 則留言`, data: { count: rows.length } };
    });

// 以管理員身分回覆（直接公開）
const replyComment = protectedProcedure
    .route({ method: "POST", path: "/comments/{id}/reply" })
    .input(z.object({
        id: z.string(),
        content: z.string().trim().min(1, "回覆內容不可為空").max(2000),
    }))
    .handler(async ({ input, context }) => {
        const parent = await db.query.comments.findFirst({ where: eq(comments.id, input.id) });
        if (!parent) return { status: "error", message: "留言不存在", data: null };

        const me = context.session.user;
        // 回覆就代表管理員看過了：待審的上層留言一起通過
        if (parent.status !== "approved") {
            await db.update(comments)
                .set({ status: "approved", moderatedAt: new Date(), moderatedBy: me.id })
                .where(eq(comments.id, parent.id));
        }

        const ip = context.ip ?? null;
        const [row] = await db.insert(comments).values({
            refType: parent.refType,
            refId: parent.refId,
            displayUsername: me.name,
            email: me.email,
            content: input.content,
            userId: me.id,
            source: "credential",
            thread: parent.id,
            ip,
            agent: context.userAgent?.slice(0, 512) ?? null,
            location: await resolveIpLocation(ip),
            status: "approved",
            moderatedAt: new Date(),
            moderatedBy: me.id,
        }).returning();

        return { status: "success", message: "已回覆", data: row };
    });

// 從留言一鍵封鎖：把留言者的 IP 或 Email 加進封鎖清單，並把這則與他還在待審的留言標成垃圾
const blockFromComment = protectedProcedure
    .route({ method: "POST", path: "/comments/{id}/block" })
    .input(z.object({
        id: z.string(),
        type: z.enum(["ip", "email"]),
    }))
    .handler(async ({ input, context }) => {
        const comment = await db.query.comments.findFirst({ where: eq(comments.id, input.id) });
        if (!comment) return { status: "error", message: "留言不存在", data: null };

        const value = input.type === "ip" ? comment.ip : comment.email.trim().toLowerCase();
        if (!value) return { status: "error", message: "這則留言沒有記錄 IP", data: null };

        await db.insert(commentBlocklist)
            .values({ type: input.type, value, note: `由留言 ${comment.id.slice(0, 8)} 封鎖` })
            .onConflictDoNothing();

        const sameSource = input.type === "ip" ? eq(comments.ip, value) : eq(comments.email, comment.email);
        const flagged = await db.update(comments)
            .set({ status: "spam", flagReason: "blocked", moderatedAt: new Date(), moderatedBy: context.session.user.id })
            .where(and(sameSource, inArray(comments.status, ["pending", "spam"])))
            .returning({ id: comments.id });
        await db.update(comments)
            .set({ status: "spam", flagReason: "blocked", moderatedAt: new Date(), moderatedBy: context.session.user.id })
            .where(eq(comments.id, comment.id));

        return {
            status: "success",
            message: `已封鎖 ${input.type === "ip" ? "IP" : "Email"} ${value}${flagged.length > 1 ? `，並將 ${flagged.length} 則待審留言標為垃圾` : ""}`,
            data: null,
        };
    });

// 永久刪除留言（硬刪除）
const deleteComment = protectedProcedure
    .route({ method: "DELETE", path: "/comments/{id}" })
    .input(z.object({
        id: z.string(),
    }))
    .handler(async ({ input }) => {
        const [deleted] = await db
            .delete(comments)
            .where(eq(comments.id, input.id))
            .returning();

        if (!deleted) {
            return { status: "error", message: "留言不存在或刪除失敗", data: null }
        }
        return { status: "success", message: "留言刪除成功", data: null }
    });

// 隱藏 / 還原留言（軟刪除切換）
const setCommentDeleted = protectedProcedure
    .route({ method: "PUT", path: "/comments/{id}/deleted" })
    .input(z.object({
        id: z.string(),
        deleted: z.boolean(),
    }))
    .handler(async ({ input }) => {
        const [row] = await db
            .update(comments)
            .set({ deleted: input.deleted, updatedAt: new Date() })
            .where(eq(comments.id, input.id))
            .returning();

        if (!row) {
            return { status: "error", message: "留言不存在", data: null }
        }
        return { status: "success", message: input.deleted ? "留言已隱藏" : "留言已還原", data: row }
    });

// 置頂 / 取消置頂留言
const setCommentPin = protectedProcedure
    .route({ method: "PUT", path: "/comments/{id}/pin" })
    .input(z.object({
        id: z.string(),
        pin: z.boolean(),
    }))
    .handler(async ({ input }) => {
        const [row] = await db
            .update(comments)
            .set({ pin: input.pin, updatedAt: new Date() })
            .where(eq(comments.id, input.id))
            .returning();

        if (!row) {
            return { status: "error", message: "留言不存在", data: null }
        }
        return { status: "success", message: input.pin ? "留言已置頂" : "已取消置頂", data: row }
    });

export default {
    getComments,
    getStatusCounts,
    getComment,
    setCommentStatus,
    replyComment,
    blockFromComment,
    deleteComment,
    setCommentDeleted,
    setCommentPin,
}
