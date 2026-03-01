import { protectedProcedure, publicProcedure } from "../index";
import { db } from "@sao-blog/db";
import { posts } from "@sao-blog/db/schema/index";
import { postSchema, createPostSchema } from "../schema/post";

const getPosts = publicProcedure.handler(() => {
    // drizzle orm 查詢 posts 資料表的所有資料
    return db.select().from(posts);
});

const createPost = protectedProcedure
    .input(createPostSchema)
    .handler(async ({ input, context }) => {
        const { title, content } = input;
        const userId = context.session?.user.id;

        return {};
    });

export default {
    getPosts,
    createPost,
};