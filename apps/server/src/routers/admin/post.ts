import { protectedProcedure, publicProcedure } from "@/orpc/index";
import { db } from "@sao-blog/db";
import { eq, desc, and } from "drizzle-orm";
import { categories, posts, user } from "@sao-blog/db/schema/index";
import z from "zod";
import { auth } from "@sao-blog/auth";

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

export default {
    getPosts,
};