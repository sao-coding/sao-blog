import { z } from "zod";
import { createApiResponseSchema } from "./api";

export const commentSchema = z.object({
    id: z.uuid(),
    refType: z.enum(["post", "note", "page", "recently"]), // 留言對象的類型（文章、日記、頁面或最近動態）
    refId: z.string(), // 文章、日記或頁面的 ID
    displayUsername: z.string(), // 顯示用的名稱
    email: z.string().email(), // 留言者的 email
    website: z.string().url().nullable(), // 留言者的網站（可選）
    content: z.string(), // 留言內容
    thread: z.string().nullable(), // 留言串 ID（可選）
    likes: z.number(), // 攢的數量
    dislikes: z.number(), // 踩的數量
    deleted: z.boolean(), // 是否已刪除
    pin: z.boolean(), // 是否置頂
    source: z.enum(["guest", "google", "github"]), // 留言來源（對應 account.providerId，例如 'guest', 'local', 'github'）
    userId: z.string().nullable(), // 留言者的用戶 ID（如果已登入）
    ip: z.string().nullable(), // 留言者的 IP 地址（可選）
    agent: z.string().nullable(), // 留言者的 User Agent（可選）
    location: z.string().nullable(), // 留言者的地理位置（可選）
    createdAt: z.date(), // 留言創建時間
    updatedAt: z.date(), // 留言更新時間
});

export const CommentResponseSchema = createApiResponseSchema(commentSchema);
export const CommentsResponseSchema = createApiResponseSchema(z.array(commentSchema));