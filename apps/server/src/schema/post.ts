import { z } from "zod";
import { createApiResponseSchema } from "./api";

//   id: string
//   title: string
//   summary: string | null
//   content: string
//   slug: string
//   cover: string | null
//   status: 'draft' | 'published' | 'archived'
//   publishedAt: string | null
//   viewCount: number
//   likeCount: number
//   commentCount: number
//   allowComments: boolean
//   pin: boolean
//   pinOrder: number
//   isSticky: boolean
//   createdAt: string
//   updatedAt: string
//   category: CategoryItem
//   tags: TagItem[]
//   author: {
//     id: string
//     username: string
//     displayUsername: string
//     name: string | null
//     email: string
//     emailVerified: boolean
//     image: string | null
//     role: string | null
//     banned: boolean
//     banReason: string | null
//     banExpires: string | null
//     createdAt: string
//     updatedAt: string
//   }

// export interface CategoryItem {
//   id: string
//   name: string
//   slug: string
//   description: string | null
//   color: string | null
//   parentId: string | null
//   sortOrder: number
//   postCount: number
//   createdAt: string
//   updatedAt: string
// }

// export interface TagItem {
//   id: string
//   name: string
//   slug: string
//   description: string | null
//   color: string | null
//   postCount?: number
//   createdAt: string
//   updatedAt: string
// }



export const postSchema = z.object({
    id: z.string(),
    title: z.string(),
    summary: z.string().nullable(),
    content: z.string(),
    slug: z.string(),
    cover: z.string().nullable(),
    status: z.enum(['draft', 'published', 'archived']),
    // publishedAt: z.string().nullable(),
    viewCount: z.number(),
    likeCount: z.number(),
    commentCount: z.number(),
    allowComments: z.boolean(),
    pin: z.boolean(),
    pinOrder: z.number(),
    // isSticky: z.boolean(),
    createdAt: z.date(),
    updatedAt: z.date(),
    category: z.object({
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
    }),
    tags: z.array(z.object({
        id: z.string(),
        name: z.string(),
        slug: z.string(),
        description: z.string().nullable(),
        color: z.string().nullable(),
        postCount: z.number().optional(),
        createdAt: z.date(),
        updatedAt: z.date(),
    })),
    author: z.object({
        id: z.string(),
        username: z.string().nullable(),
        displayUsername: z.string().nullable(),
        name: z.string().nullable(),
        email: z.string(),
        emailVerified: z.boolean(),
        image: z.string().nullable(),
        role: z.string().nullable(),
        banned: z.boolean().nullable(),
        banReason: z.string().nullable(),
        banExpires: z.date().nullable(),
        createdAt: z.date(),
        updatedAt: z.date(),
    }),
});

export const createPostSchema = z.object({
    slug: z.string().max(256),
    title: z.string().max(200),
    content: z.string().max(10000),
    summary: z.string().max(200).optional(),
    category: z.string().uuid().optional(),
    tags: z.array(z.string().uuid()).optional(),
    cover: z.string().url().optional(),
    allowComments: z.boolean().default(true),
    pin: z.boolean().default(false),
    pinOrder: z.number().default(0),
    status: z.enum(["draft", "published"]).default("draft"),
});

export const PostsResponseSchema = createApiResponseSchema(z.array(postSchema));
export const PostResponseSchema = createApiResponseSchema(postSchema.nullable());
export type Post = z.infer<typeof postSchema>;