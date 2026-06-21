import { protectedProcedure, publicProcedure } from "@sao-blog/api/index";
import { db } from "@sao-blog/db";
import { eq, desc, and, inArray } from "drizzle-orm";
import { comments, commentLikes, account, posts } from "@sao-blog/db/schema/index";
import z from "zod";
import { CommentsResponseSchema } from "@sao-blog/api/schema/comment";
import { resolveIpLocation } from "@sao-blog/api/lib/ip-region";

/** 留言內容長度上限，避免儲存型 DoS */
const MAX_COMMENT_LENGTH = 2000;

/**
 * 僅允許 http / https 的網址，擋掉 javascript: / data: 等 XSS scheme。
 * 注意：zod 的 .url() 會把 "javascript:alert(1)" 視為合法 URL，故需額外白名單。
 */
function sanitizeWebsite(website: string | undefined | null): string | null {
  if (!website) return null;
  try {
    const url = new URL(website);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }
  } catch {
    // 非合法 URL
  }
  return null;
}

// 獲取每篇文章 or 日記的留言列表（用於文章或日記頁面）
const getComments = publicProcedure
    .route({ method: "GET", path: "/comments/{refId}" })
    .input(z.object({
        type: z.enum(["post", "note", "page", "recently"]),
        refId: z.string(),
    }))
    .output(CommentsResponseSchema)
    .handler(async ({ input, context }) => {
        const { type, refId } = input;
        const userId = context.session?.user.id ?? null;

        const commentsList = await db
            .select()
            .from(comments)
            .where(and(
                eq(comments.refId, refId),
                eq(comments.refType, type)
            ))
            .orderBy(desc(comments.createdAt));

        // 若已登入，批次查詢此用戶對這些留言的按讚紀錄
        let likedMap = new Map<string, boolean>();
        if (userId && commentsList.length > 0) {
            const commentIds = commentsList.map(c => c.id);
            const likeRecords = await db
                .select()
                .from(commentLikes)
                .where(and(
                    eq(commentLikes.userId, userId),
                    inArray(commentLikes.commentId, commentIds)
                ));

            likeRecords.forEach(r => likedMap.set(r.commentId, r.like));
        }

        const processedComments = commentsList.map(comment => ({
            ...comment,
            content: comment.deleted ? "[此評論已被刪除]" : comment.content,
            // 隱私：公開介面只顯示歸屬地（location），不外洩真實 IP 與 User-Agent
            ip: null,
            agent: null,
            liked: userId
                ? (likedMap.has(comment.id) ? likedMap.get(comment.id)! : null)
                : null,
        }));

        return {
            status: "success",
            message: "留言列表取得成功",
            meta: undefined,
            data: processedComments,
        }
    });

// 創建留言
const createComment = protectedProcedure
    .route({ method: "POST", path: "/comments" })
    .input(z.object({
        type: z.enum(["post", "note", "page", "recently"]),
        refId: z.string(),
        content: z.string().trim().min(1, "留言內容不可為空").max(MAX_COMMENT_LENGTH, `留言內容不可超過 ${MAX_COMMENT_LENGTH} 字`),
        website: z.string().url().optional(),
        thread: z.string().optional(),
    }))
    .handler(async ({ input, context }) => {
        const { type, refId, content, thread } = input;
        const userId = context.session.user.id;
        const displayUsername = context.session.user.name;
        const email = context.session.user.email;

        // 文章關閉留言時不可新增（僅針對 post）
        if (type === "post") {
            const post = await db.query.posts.findFirst({
                where: eq(posts.id, refId),
                columns: { id: true, allowComments: true },
            });
            if (!post) {
                return { status: "error", message: "文章不存在" };
            }
            if (!post.allowComments) {
                return { status: "error", message: "此文章已關閉留言" };
            }
        }

        const [userAccount] = await db
            .select()
            .from(account)
            .where(eq(account.userId, userId))
            .limit(1);

        const providerId = userAccount?.providerId;
        let source: "google" | "github" | "credential";
        if (providerId === 'github' || providerId === 'google') {
            source = providerId;
        } else {
            source = 'credential';
        }

        // 解析來源資訊：IP / User-Agent / 歸屬地
        const ip = context.ip ?? null;
        const agent = context.userAgent?.slice(0, 512) ?? null;
        const location = await resolveIpLocation(ip);
        const website = sanitizeWebsite(input.website);

        const [newComment] = await db.insert(comments).values({
            refType: type,
            refId,
            displayUsername,
            email,
            content,
            website,
            userId,
            source,
            thread,
            ip,
            agent,
            location,
        }).returning();

        return {
            status: "success",
            message: "留言創建成功",
            data: newComment,
        }
    })

// 刪除留言 軟刪除
const deleteComment = publicProcedure
    .route({ method: "DELETE", path: "/comments/{id}" })
    .input(z.object({
        id: z.uuid(),
    }))
    .handler(async ({ input, context }) => {
        const { id } = input;
        const userId = context.session?.user.id
        if (!userId) {
            return {
                status: "error",
                message: "未登入",
            }
        }

        await db.update(comments)
            .set({ deleted: true })
            .where(and(
                eq(comments.id, id),
                eq(comments.userId, userId) // 只能刪除自己的留言
            ));

        return {
            status: "success",
            message: "留言刪除成功",
        }
    });

// 按攢和踩功能
const likeComment = protectedProcedure
    .route({ method: "POST", path: "/comments/{id}/like" })
    .input(z.object({
        id: z.uuid(),
        like: z.boolean(), // true 表示攢，false 表示踩
    }))
    .handler(async ({ input, context }) => {
        const { id, like } = input;
        const userId = context.session?.user.id ?? null;
        if (!userId) {
            return {
                status: "error",
                message: "未登入",
            }
        }
        // const [comment] = await db
        //     .select()
        //     .from(comments)
        //     .where(eq(comments.id, id));
        const comment = await db.query.comments.findFirst({
            where: (comment) => eq(comment.id, id),
        });
        if (!comment) {
            return {
                status: "error",
                message: "留言不存在",
            }
        }

        // commentLikes 表中記錄了用戶對留言的點讚狀態（like = true 表示攢，like = false 表示踩）並且更新 comments 表中的攢和踩數量
        const existingLike = await db.query.commentLikes.findFirst({
            where: (like) => and(
                eq(like.commentId, id),
                eq(like.userId, userId)
            ),
        });

        if (existingLike) {
            if (existingLike.like === like) {
                // 如果用戶已經點過同樣的讚，則取消點讚
                // 更新 commentLikes 表中對應的記錄
                await db.delete(commentLikes)
                    .where(
                        and(
                            eq(commentLikes.commentId, id),
                            eq(commentLikes.userId, userId)
                        )
                    );
                // 更新 comments 表中的攢和踩數量
                await db.update(comments)
                    .set({
                        likes: comment.likes - (like ? 1 : 0),
                        dislikes: comment.dislikes - (like ? 0 : 1),
                    })
                    .where(eq(comments.id, id));
            } else {
                // 如果用戶點了不同的讚，則更新點讚狀態
                // 更新 commentLikes 表中對應的記錄
                await db.update(commentLikes)
                    .set({ like })
                    .where(
                        and(
                            eq(commentLikes.commentId, id),
                            eq(commentLikes.userId, userId)
                        )
                    );
                // 更新 comments 表中的攢和踩數量
                await db.update(comments)
                    .set({
                        likes: comment.likes + (like ? 1 : -1),
                        dislikes: comment.dislikes + (like ? -1 : 1),
                    })
                    .where(eq(comments.id, id));
            }
        } else {
            // 如果用戶沒有點過讚，則新增點讚記錄
            // 在 commentLikes 表中插入新記錄
            await db.insert(commentLikes).values({
                commentId: id,
                userId,
                like,
            });
            // 更新 comments 表中的攢和踩數量
            await db.update(comments)
                .set({
                    likes: comment.likes + (like ? 1 : 0),
                    dislikes: comment.dislikes + (like ? 0 : 1),
                })
                .where(eq(comments.id, id));
        }

        return {
            status: "success",
            message: "操作成功",
            data: {
                userId,
                commentId: id,
                like,
            }
        }
    })

export default {
    getComments,
    createComment,
    deleteComment,
    likeComment,
}