import { protectedProcedure, publicProcedure } from "@sao-blog/api/index";
import { db } from "@sao-blog/db";
import { eq, desc, and, inArray, or, sql } from "drizzle-orm";
import { comments, commentLikes, account, posts, user } from "@sao-blog/db/schema/index";
import z from "zod";
import { CommentsResponseSchema } from "@sao-blog/api/schema/comment";
import { resolveIpLocation } from "@sao-blog/api/lib/geoip";
import { guardComment, guardLike } from "@sao-blog/api/lib/comment-guard";
import { syncPostCommentCounts } from "@sao-blog/api/lib/post-counters";

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
// 公開只顯示已通過的留言；登入者另外看得到自己還在審核中的留言（垃圾也顯示成審核中，不透露判定結果）
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

        const visible = userId
            ? or(
                eq(comments.status, "approved"),
                and(eq(comments.userId, userId), inArray(comments.status, ["pending", "spam"])),
            )
            : eq(comments.status, "approved");

        const commentsList = await db
            .select({
                id: comments.id,
                refType: comments.refType,
                refId: comments.refId,
                displayUsername: comments.displayUsername,
                image: user.image,
                authorRole: user.role,
                website: comments.website,
                content: comments.content,
                thread: comments.thread,
                likes: comments.likes,
                dislikes: comments.dislikes,
                deleted: comments.deleted,
                pin: comments.pin,
                source: comments.source,
                userId: comments.userId,
                location: comments.location,
                status: comments.status,
                createdAt: comments.createdAt,
                updatedAt: comments.updatedAt,
            })
            .from(comments)
            .leftJoin(user, eq(user.id, comments.userId))
            .where(and(
                eq(comments.refId, refId),
                eq(comments.refType, type),
                visible,
            ))
            .orderBy(desc(comments.createdAt));

        // 若已登入，批次查詢此用戶對這些留言的按讚紀錄
        const likedMap = new Map<string, boolean>();
        if (userId && commentsList.length > 0) {
            const likeRecords = await db
                .select()
                .from(commentLikes)
                .where(and(
                    eq(commentLikes.userId, userId),
                    inArray(commentLikes.commentId, commentsList.map(c => c.id)),
                ));
            likeRecords.forEach(r => likedMap.set(r.commentId, r.like));
        }

        const processedComments = commentsList.map(({ authorRole, ...comment }) => ({
            ...comment,
            // 只回傳「是不是站長」，不外洩實際角色名稱
            isAuthor: Boolean(authorRole) && authorRole !== "user",
            content: comment.deleted ? "[此評論已被刪除]" : comment.content,
            // 對留言者本人來說，垃圾跟待審看起來一樣
            status: comment.status === "spam" ? ("pending" as const) : comment.status,
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

// 創建留言：經過 lib/comment-guard 的蜜罐 / Turnstile / 限流 / 封鎖清單 / 過濾 / 信任判斷
const createComment = protectedProcedure
    .route({ method: "POST", path: "/comments" })
    .input(z.object({
        type: z.enum(["post", "note", "page", "recently"]),
        refId: z.string(),
        content: z.string().trim().min(1, "留言內容不可為空").max(MAX_COMMENT_LENGTH, `留言內容不可超過 ${MAX_COMMENT_LENGTH} 字`),
        website: z.string().url().optional(),
        thread: z.string().optional(),
        /** 蜜罐欄位：表單上看不到，機器人才會填 */
        hp: z.string().max(200).optional(),
        /** Cloudflare Turnstile token */
        turnstileToken: z.string().max(4096).optional(),
    }))
    .handler(async ({ input, context }) => {
        const { type, refId, content, thread } = input;
        const sessionUser = context.session.user;
        const ip = context.ip ?? null;

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

        // 回覆：上層留言必須存在、在同一篇、而且已公開（不能掛在待審或垃圾留言底下）
        if (thread) {
            const parent = await db.query.comments.findFirst({
                where: eq(comments.id, thread),
                columns: { id: true, refId: true, status: true, deleted: true },
            });
            if (!parent || parent.refId !== refId || parent.status !== "approved" || parent.deleted) {
                return { status: "error", message: "要回覆的留言不存在" };
            }
        }

        const verdict = await guardComment({
            content,
            honeypot: input.hp,
            turnstileToken: input.turnstileToken,
            user: sessionUser,
            ip,
        });
        if (verdict.kind === "reject") return { status: "error", message: verdict.message };
        if (verdict.kind === "drop") {
            return { status: "success", message: "留言已送出，審核通過後就會顯示", data: { status: "pending" as const } };
        }

        const [userAccount] = await db
            .select({ providerId: account.providerId })
            .from(account)
            .where(eq(account.userId, sessionUser.id))
            .limit(1);
        const providerId = userAccount?.providerId;
        const source: "google" | "github" | "credential" =
            providerId === "github" || providerId === "google" ? providerId : "credential";

        const [newComment] = await db.insert(comments).values({
            refType: type,
            refId,
            displayUsername: sessionUser.name,
            email: sessionUser.email,
            content,
            website: sanitizeWebsite(input.website),
            userId: sessionUser.id,
            source,
            thread,
            ip,
            agent: context.userAgent?.slice(0, 512) ?? null,
            location: await resolveIpLocation(ip),
            status: verdict.status,
            flagReason: verdict.flagReason,
        }).returning({ id: comments.id });

        const published = verdict.status === "approved";
        if (published && type === "post") await syncPostCommentCounts([refId]);
        return {
            status: "success",
            message: published ? "留言已送出！" : "留言已送出，審核通過後就會顯示",
            // 垃圾一樣回 pending，不讓對方知道被判定成垃圾
            data: { id: newComment?.id, status: published ? ("approved" as const) : ("pending" as const) },
        }
    })

// 刪除留言 軟刪除（只能刪自己的）
const deleteComment = publicProcedure
    .route({ method: "DELETE", path: "/comments/{id}" })
    .input(z.object({
        id: z.uuid(),
    }))
    .handler(async ({ input, context }) => {
        const userId = context.session?.user.id
        if (!userId) {
            return { status: "error", message: "未登入" }
        }

        const removed = await db.update(comments)
            .set({ deleted: true })
            .where(and(eq(comments.id, input.id), eq(comments.userId, userId)))
            .returning({ refId: comments.refId, refType: comments.refType });
        const gone = removed.filter((r) => r.refType === "post").map((r) => r.refId);
        await syncPostCommentCounts(gone);

        return { status: "success", message: "留言刪除成功" }
    });

// 讚 / 踩：同一個人再按一次同樣的就取消，按另一個就切換。
// 計數用 SQL 原子遞增（likes = likes + 1），不再「讀出來加一再寫回去」，多人同時按才不會互相覆蓋
const likeComment = protectedProcedure
    .route({ method: "POST", path: "/comments/{id}/like" })
    .input(z.object({
        id: z.uuid(),
        like: z.boolean(), // true 表示攢，false 表示踩
    }))
    .handler(async ({ input, context }) => {
        const { id, like } = input;
        const userId = context.session.user.id;

        const limited = await guardLike(userId);
        if (limited) return { status: "error", message: limited };

        const comment = await db.query.comments.findFirst({
            where: (c) => and(eq(c.id, id), eq(c.status, "approved")),
            columns: { id: true },
        });
        if (!comment) {
            return { status: "error", message: "留言不存在" }
        }

        const likesCol = like ? comments.likes : comments.dislikes;
        const otherCol = like ? comments.dislikes : comments.likes;
        const likesKey = like ? "likes" : "dislikes";
        const otherKey = like ? "dislikes" : "likes";

        const result = await db.transaction(async (tx) => {
            const existing = await tx.query.commentLikes.findFirst({
                where: (l) => and(eq(l.commentId, id), eq(l.userId, userId)),
            });

            if (existing?.like === like) {
                // 再按一次同樣的 → 取消
                await tx.delete(commentLikes).where(and(eq(commentLikes.commentId, id), eq(commentLikes.userId, userId)));
                await tx.update(comments)
                    .set({ [likesKey]: sql`greatest(${likesCol} - 1, 0)` })
                    .where(eq(comments.id, id));
                return { like: null };
            }

            if (existing) {
                // 讚 ↔ 踩 切換
                await tx.update(commentLikes).set({ like }).where(and(eq(commentLikes.commentId, id), eq(commentLikes.userId, userId)));
                await tx.update(comments)
                    .set({ [likesKey]: sql`${likesCol} + 1`, [otherKey]: sql`greatest(${otherCol} - 1, 0)` })
                    .where(eq(comments.id, id));
                return { like };
            }

            // 主鍵 (userId, commentId) 擋住重複送出；連點兩次時第二次什麼都不做
            const inserted = await tx.insert(commentLikes).values({ commentId: id, userId, like })
                .onConflictDoNothing()
                .returning({ commentId: commentLikes.commentId });
            if (inserted.length > 0) {
                await tx.update(comments).set({ [likesKey]: sql`${likesCol} + 1` }).where(eq(comments.id, id));
            }
            return { like };
        });

        return {
            status: "success",
            message: "操作成功",
            data: { userId, commentId: id, like: result.like },
        }
    })

export default {
    getComments,
    createComment,
    deleteComment,
    likeComment,
}
