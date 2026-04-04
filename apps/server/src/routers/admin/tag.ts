import { protectedProcedure, publicProcedure } from "@/orpc/index";
import { db } from "@sao-blog/db";
import { eq, desc, and } from "drizzle-orm";
import { categories, posts, user, tags, postTags, type TagModel } from "@sao-blog/db/schema/index";
import z from "zod";
import { auth } from "@sao-blog/auth";

const getTags = protectedProcedure
    .route({ method: "GET", path: "/tags" })
    .handler(async () => {
        const result = await db
            .select()
            .from(tags)
            .orderBy(desc(tags.createdAt));

        return {
            status: "success",
            message: "標籤列表取得成功",
            data: result,
        }
    });

export default {
    getTags
}