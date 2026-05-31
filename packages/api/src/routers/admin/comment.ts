import { protectedProcedure } from "@sao-blog/api/index";
import { db } from "@sao-blog/db";
import { eq, desc } from "drizzle-orm";
import { comments } from "@sao-blog/db/schema/index";
import z from "zod";

// 取得全部留言（後台管理用）
const getComments = protectedProcedure
    .route({ method: "GET", path: "/comments" })
    .handler(async () => {
        const result = await db
            .select()
            .from(comments)
            .orderBy(desc(comments.createdAt));

        return {
            status: "success",
            message: "留言列表取得成功",
            data: result,
        }
    });

// 取得單一留言
const getComment = protectedProcedure
    .route({ method: "GET", path: "/comments/{id}" })
    .input(z.object({
        id: z.string(),
    }))
    .handler(async ({ input }) => {
        const { id } = input;
        const [row] = await db
            .select()
            .from(comments)
            .where(eq(comments.id, id))
            .limit(1);

        if (!row) {
            return {
                status: "error",
                message: "留言不存在",
                data: null,
            }
        }

        return {
            status: "success",
            message: "留言取得成功",
            data: row,
        }
    });

// 永久刪除留言（硬刪除）
const deleteComment = protectedProcedure
    .route({ method: "DELETE", path: "/comments/{id}" })
    .input(z.object({
        id: z.string(),
    }))
    .handler(async ({ input }) => {
        const { id } = input;
        const [deleted] = await db
            .delete(comments)
            .where(eq(comments.id, id))
            .returning();

        if (!deleted) {
            return {
                status: "error",
                message: "留言不存在或刪除失敗",
                data: null,
            }
        }

        return {
            status: "success",
            message: "留言刪除成功",
            data: null,
        }
    });

// 隱藏 / 還原留言（軟刪除切換）
const setCommentDeleted = protectedProcedure
    .route({ method: "PUT", path: "/comments/{id}/deleted" })
    .input(z.object({
        id: z.string(),
        deleted: z.boolean(),
    }))
    .handler(async ({ input }) => {
        const { id, deleted } = input;
        const [row] = await db
            .update(comments)
            .set({ deleted, updatedAt: new Date() })
            .where(eq(comments.id, id))
            .returning();

        if (!row) {
            return {
                status: "error",
                message: "留言不存在",
                data: null,
            }
        }

        return {
            status: "success",
            message: deleted ? "留言已隱藏" : "留言已還原",
            data: row,
        }
    });

// 置頂 / 取消置頂留言
const setCommentPin = protectedProcedure
    .route({ method: "PUT", path: "/comments/{id}/pin" })
    .input(z.object({
        id: z.string(),
        pin: z.boolean(),
    }))
    .handler(async ({ input }) => {
        const { id, pin } = input;
        const [row] = await db
            .update(comments)
            .set({ pin, updatedAt: new Date() })
            .where(eq(comments.id, id))
            .returning();

        if (!row) {
            return {
                status: "error",
                message: "留言不存在",
                data: null,
            }
        }

        return {
            status: "success",
            message: pin ? "留言已置頂" : "已取消置頂",
            data: row,
        }
    });

export default {
    getComments,
    getComment,
    deleteComment,
    setCommentDeleted,
    setCommentPin,
}
