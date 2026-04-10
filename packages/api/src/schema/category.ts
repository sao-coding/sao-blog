import { z } from "zod";
import { createApiResponseSchema } from "./api";

export const categorySchema = z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    description: z.string().nullable(),
    color: z.string().nullable(),
    parentId: z.string().nullable(),
    sortOrder: z.number(),
    postCount: z.number(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export const categoryInputSchema = z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    description: z.string().nullable(),
    color: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
});