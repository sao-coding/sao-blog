import { z } from "zod";
import { createApiResponseSchema } from "./api";

export const thinkingSchema = z.object({
    id: z.string(),
    content: z.string(),
    status: z.boolean(),
    noteId: z.string().nullable(),
    authorId: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

// 前台想法項目（附帶可選的所屬日記資訊）
export const thinkingItemSchema = thinkingSchema.extend({
    note: z
        .object({
            id: z.string(),
            title: z.string(),
        })
        .nullable(),
});

export const thinkingInputSchema = z.object({
    content: z.string().min(1, "請輸入想法內容"),
    status: z.boolean(),
    noteId: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export const ThinkingResponseSchema = createApiResponseSchema(thinkingSchema);
export const ThinkingsResponseSchema = createApiResponseSchema(
    z.array(thinkingItemSchema),
    z.object({ total: z.number() })
);
