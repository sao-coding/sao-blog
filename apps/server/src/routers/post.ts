import { protectedProcedure, publicProcedure } from "@/orpc/index";
import { db } from "@sao-blog/db";
import { posts, categories, postTags, tags, user } from "@sao-blog/db/schema/index";
import { type TagModel } from "@sao-blog/db/schema/index";
import { PostsResponseSchema, createPostSchema } from "../schema/post";
import { eq, inArray } from "drizzle-orm";

const getPosts = publicProcedure
    .output(PostsResponseSchema)
    .handler(async () => {
    // 1) 先用 left join 取得 posts、author、category（若有）
    const rows = await db
        .select({ post: posts, author: user, category: categories })
        .from(posts)
        .innerJoin(user, eq(posts.authorId, user.id))
        .leftJoin(categories, eq(posts.categoryId, categories.id));

    const postIds = rows.map((r) => String(r.post.id));

    // 2) 再查所有 post 的 tags（透過 post_tags join tags）並聚合
    let tagRows: Array<{ postId: string; tag: TagModel | null }> = [];
    if (postIds.length) {
        tagRows = await db
            .select({ postId: postTags.postId, tag: tags })
            .from(postTags)
            .leftJoin(tags, eq(postTags.tagId, tags.id))
            .where(inArray(postTags.postId, postIds));
    }

    const tagsByPost = new Map<string, TagModel[]>();
    for (const tr of tagRows) {
        if (!tr.tag) continue;

        const pid = String(tr.postId);
        const arr = tagsByPost.get(pid) ?? [];
        arr.push(tr.tag);
        tagsByPost.set(pid, arr);
    }

    // 3) 直接回傳資料庫原始欄位（不重新命名），並把 author/category/tags 附加上去
    const result = rows.map((r) => {
        const { post, author, category} = r;
        const tags = tagsByPost.get(String(post.id)) ?? [];
    
        return {
            ...post,
            author,
            category,
            tags,
        };
    });

    return {
        status: "success",
        message: "文章列表取得成功",
        data: result,
    }
});

const createPost = protectedProcedure
    .input(createPostSchema)
    .handler(async ({ input, context }) => {
        // const { title, content } = input;
        const userId = context.session?.user.id;

        return {};
    });

export default {
    getPosts,
    createPost,
};