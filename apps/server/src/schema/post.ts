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
    }).nullable(),
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
    title: z.string(),
    content: z.string(),
});

export const PostsResponseSchema = createApiResponseSchema(z.array(postSchema));
export const PostResponseSchema = createApiResponseSchema(postSchema.nullable());
export type Post = z.infer<typeof postSchema>;
export type CreatePostInput = z.infer<typeof createPostSchema>;