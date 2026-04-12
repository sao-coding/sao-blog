import { z } from "zod";
import { createApiResponseSchema } from "./api";

export const noteSchema = z.object({
    id: z.string(),
    title: z.string(),
    mood: z.string(),
    weather: z.string(),
    bookmark: z.boolean(),
    coordinates: z.string().nullable(),
    location: z.string().nullable(),
    status: z.boolean(),
    content: z.string(),
    authorId: z.string(),
    topicId: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export const noteInputSchema = z.object({
    title: z.string(),
    mood: z.string(),
    weather: z.string(),
    bookmark: z.boolean(),
    coordinates: z.string().nullable(),
    location: z.string().nullable(),
    status: z.boolean(),
    content: z.string(),
    topicId: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
});