import { z } from "zod";
import { createApiResponseSchema } from "./api";
import { categorySchema } from "./category";

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
  title: z.string().min(1, '請輸入文章標題'),
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
  category: categorySchema,
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

export const postInputSchema = z.object({
  // 更新時需要，新增時不需要 → optional (但因為空字串可以不需要)
  id: z.string(),

  title: z.string().min(1, '請輸入文章標題'),
  summary: z.string().nullable().optional(),
  content: z.string().min(1, '請輸入文章內容'),
  slug: z.string().min(1, '請輸入文章網址'),
  cover: z.string().nullable().optional(),
  status: z.enum(['draft', 'published', 'archived']),
  allowComments: z.boolean(),
  pin: z.boolean(),
  pinOrder: z.number(),

  // 只需要 id 就夠了，後端自己去查
  category: z.object({
    id: z.string(),
  }),
  tags: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })).optional(),

  createdAt: z.date(),
  updatedAt: z.date(),
})

export const PostsResponseSchema = createApiResponseSchema(z.array(postSchema));
export const PostResponseSchema = createApiResponseSchema(postSchema);
export type Post = z.infer<typeof postSchema>;