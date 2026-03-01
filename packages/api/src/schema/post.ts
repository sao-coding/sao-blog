import { z } from "zod";

    // "id": "0199821f-0526-7143-8ba5-f471c6793914",
    // "slug": "asd",
    // "title": "sd",
    // "summary": "asd",
    // "content": "asd",
    // "authorId": "01998180-7793-707f-abde-4a5352d4e4b3",
    // "categoryId": "01998200-86d1-741e-8866-c97d2d8cd6e0",
    // "cover": "",
    // "status": "published",
    // "viewCount": 0,
    // "likeCount": 0,
    // "commentCount": 0,
    // "copyright": true,
    // "pin": false,
    // "pinOrder": 0,
    // "allowComments": true,
    // "createdAt": "2025-09-25T18:24:55.079Z",
    // "updatedAt": "2025-09-25T18:24:55.079Z"

export const postSchema = z.object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    summary: z.string(),
    content: z.string(),
    authorId: z.string(),
    categoryId: z.string(),
    cover: z.string(),
    status: z.enum(["published", "draft", "archived"]),
    viewCount: z.number(),
    likeCount: z.number(),
    commentCount: z.number(),
    copyright: z.boolean(),
    pin: z.boolean(),
    pinOrder: z.number().optional(),
    allowComments: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

export const createPostSchema = z.object({
    title: z.string(),
    content: z.string(),
});

export type Post = z.infer<typeof postSchema>;
export type CreatePostInput = z.infer<typeof createPostSchema>;