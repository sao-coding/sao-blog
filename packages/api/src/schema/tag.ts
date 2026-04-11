import { z } from "zod";
import { createApiResponseSchema } from "./api";

export const tagSchema = z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    description: z.string().nullable(),
    color: z.string().nullable(),
    postCount: z.number(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export const tagInputSchema = z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    description: z.string().nullable(),
    color: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
});