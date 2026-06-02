import { z } from "zod";
import { createApiResponseSchema } from "./api";

// 導覽列 hover 卡片所需的聚合資料
export const MenuDataSchema = z.object({
    // 首頁卡片統計：文 / 萬字 / 日
    stats: z.object({
        writingCount: z.number(),
        wordCountWan: z.number(),
        days: z.number(),
    }),
    // 文章卡片：分類（含篇數）
    categories: z.array(
        z.object({
            name: z.string(),
            slug: z.string(),
            postCount: z.number(),
        })
    ),
    // 文章卡片：近期文章
    recentPosts: z.array(
        z.object({
            id: z.string(),
            slug: z.string(),
            title: z.string(),
            category: z.string().nullable(),
            createdAt: z.string(),
        })
    ),
    // 日記卡片：專欄
    topics: z.array(
        z.object({
            id: z.string(),
            name: z.string(),
            slug: z.string(),
            color: z.string().nullable(),
            noteCount: z.number(),
        })
    ),
    // 日記卡片：近期手記
    recentNotes: z.array(
        z.object({
            id: z.string(),
            title: z.string(),
            createdAt: z.string(),
        })
    ),
    // 時光卡片：近期動態（文章 + 日記混合）
    recentActivity: z.array(
        z.object({
            id: z.string(),
            title: z.string(),
            href: z.string(),
            type: z.enum(["post", "note"]),
            createdAt: z.string(),
        })
    ),
    // 想法卡片：近期想法
    recentThinkings: z.array(
        z.object({
            id: z.string(),
            content: z.string(),
            createdAt: z.string(),
        })
    ),
    // 卡片頁尾統計
    postTotal: z.number(),
    noteTotal: z.number(),
});

export const MenuResponseSchema = createApiResponseSchema(MenuDataSchema);
