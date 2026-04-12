import { z } from "zod";
import { createApiResponseSchema } from "./api";

export const topicSchema = z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    introduce: z.string().max(100),
    description: z.string().max(400).nullable(),
    color: z.string().regex(/^#([0-9A-Fa-f]{6})$/).nullable(),
    noteCount: z.number(),
    createdAt: z.date(),
    updatedAt: z.date()
})

export const topicInputSchema = z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    introduce: z.string().max(100),
    description: z.string().max(400).nullable(),
    color: z.string().regex(/^#([0-9A-Fa-f]{6})$/).nullable(),
    createdAt: z.date(),
    updatedAt: z.date()
})
