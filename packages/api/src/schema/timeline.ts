import z from "zod";
import { createApiResponseSchema } from "./api";

// 要分年分還要知道有幾篇
export const TimelineSchema = z.object({
    year: z.number(),
    count: z.number(),
    items: z.array(z.object({
        id: z.string(),
        title: z.string(),
        slug: z.string(),
        type: z.enum(["post", "note"]),
        category: z.string().nullable(),
        weather: z.string().nullable(),
        mood: z.string().nullable(),
        createdAt: z.string(),
        updatedAt: z.string(),
    })),
});

// type = note
export const TimelineNoteSchema = z.object({
    year: z.number(),
    count: z.number(),
    items: z.array(z.object({
        id: z.string(),
        title: z.string(),
        slug: z.string(),
        type: z.enum(["note"]),
        weather: z.string().nullable(),
        mood: z.string().nullable(),
        createdAt: z.string(),
        updatedAt: z.string(),
    })),
});

// type = post
export const TimelinePostSchema = z.object({
    year: z.number(),
    count: z.number(),
    items: z.array(z.object({
        id: z.string(),
        title: z.string(),
        slug: z.string(),
        type: z.enum(["post"]),
        category: z.string().nullable(),
    })),
});

export const TimelineInputSchema = z.object({
    type: z.enum(["post", "note"]).optional(),
});

const TimelineMetaSchema = z.object({
    total: z.number(),
});

export const TimelineResponseSchema = createApiResponseSchema(z.array(TimelineSchema), TimelineMetaSchema);
export const TimelineNoteResponseSchema = createApiResponseSchema(z.array(TimelineNoteSchema), TimelineMetaSchema);
export const TimelinePostResponseSchema = createApiResponseSchema(z.array(TimelinePostSchema), TimelineMetaSchema);