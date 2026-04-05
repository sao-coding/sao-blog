import { protectedProcedure, publicProcedure } from "@/orpc/index";
import { db } from "@sao-blog/db";
import { eq, desc, and } from "drizzle-orm";
import { categories, posts, user, tags, postTags, type TagModel } from "@sao-blog/db/schema/index";
import z from "zod";
import { auth } from "@sao-blog/auth";
import { createPostSchema } from "@/schema/post";

// 管理員系統員系統

const getPosts = protectedProcedure
    .route({ method: "GET", path: "/posts" })
    .handler(async () => {
        const result = await db
            .select({ 
                id: posts.id,
                title: posts.title,
                slug: posts.slug,
                cover: posts.cover,
                status: posts.status,
                createdAt: posts.createdAt,
                updatedAt: posts.updatedAt,
                author: {
                    id: user.id,
                    name: user.name,
                }
            })
            .from(posts)
            .innerJoin(user, eq(posts.authorId, user.id))
            .leftJoin(categories, eq(posts.categoryId, categories.id));

        return {
            status: "success",
            message: "文章列表取得成功",
            data: result,
        }
    });

const getPost = protectedProcedure
    .route({ method: "GET", path: "/posts/{id}" })
    .input(z.object({
        id: z.string(),
    }))
    .handler(async ({ input }) => {
        const { id } = input;
        // 1) 先用 left join 取得 post、author、category（若有）
        const [row] = await db
            .select({ post: posts, author: user, category: categories })
            .from(posts)
            .innerJoin(user, eq(posts.authorId, user.id))
            .innerJoin(categories, eq(posts.categoryId, categories.id))
            .where(eq(posts.id, id))
            .limit(1);

        console.log(`Fetching post with id: ${id}`, row);
        if (!row) {
            return {
                status: "error",
                message: "文章不存在",
                meta: undefined,
                data: null,
            };
        }

        // 2) 再查該 post 的 tags（透過 post_tags join tags）
        const tagRows = await db
            .select({ tag: tags })
            .from(postTags)
            .leftJoin(tags, eq(postTags.tagId, tags.id))
            .where(eq(postTags.postId, row.post.id));

        const tagsByPost = tagRows.map((tr) => tr.tag).filter((t): t is TagModel => t !== null);

        const { post, author, category} = row;
    
        return {
            status: "success",
            message: "文章取得成功",
            meta: undefined,
            data: {
                ...post,
                author,
                category,
                tags: tagsByPost,
            },
        };
    });

// 創建貼文
const createPost = protectedProcedure
    .route({ method: "POST", path: "/posts" })
    .input(createPostSchema)
    .handler(async ({ input, context }) => {
        const { slug, title, content, summary, category, tags, cover, allowComments, pin, pinOrder, status } = input;
        const authorId = context.session?.user.id;

        // 檢查 slug 是否已存在
        const existingPost = await db
            .select()
            .from(posts)
            .where(eq(posts.slug, slug))
            .limit(1);

        if (existingPost.length > 0) {
            return {
                status: "error",
                message: "文章 slug 已存在",
                meta: undefined,
                data: null,
            };
        }

        // 創建新文章
        const [newPost] = await db
            .insert(posts)
            .values({
                authorId,
                slug,
                title,
                content,
                summary,
                categoryId: category || null,
                cover: cover || null,
                // 不傳 createdAt/updatedAt，讓 DB 使用 $defaultFn()
                allowComments,
                pin,
                pinOrder,
                status,
            })
            .returning();

        // 處理標籤
        if (!newPost) {
            return {
                status: "error",
                message: "文章建立失敗",
                meta: undefined,
                data: null,
            };
        }

        if (tags && tags.length > 0) {
            const tagInserts = tags.map((tagId) => ({
                postId: newPost.id,
                tagId,
            }));
            await db.insert(postTags).values(tagInserts);
        }

        return {
            status: "success",
            message: "文章創建成功",
            meta: undefined,
            data: newPost,
        };
    });


export default {
    getPosts,
    getPost,
    createPost,
};