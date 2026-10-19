import { protectedProcedure, publicProcedure } from "@sao-blog/api/index";
import { db } from "@sao-blog/db";
import { posts, categories, postTags, tags, user } from "@sao-blog/db/schema/index";
import { type TagModel } from "@sao-blog/db/schema/index";
import { PostResponseSchema, PostsResponseSchema } from "../schema/post";
import { eq, inArray, desc, and } from "drizzle-orm";
import z from "zod";
import { mdxToExcerpt } from "../lib/mdx-to-text";
import { ensureCompiled, localizedCategories, localizePosts } from "../lib/i18n";
import { localeInput } from "../schema/i18n";

const getPosts = publicProcedure
    .route({ method: "GET", path: "/posts" })
    .input(z.object({
        category: z.string().optional(),
        ...localeInput,
    }))
    .output(PostsResponseSchema)
    .handler(async ({ input }) => {
        const { category, locale } = input;
        // 1) 先用 left join 取得 posts、author、category（若有）
        // 1) 查詢 posts + author + category，條件可選
        const rows = await db
            .select({ post: posts, author: user, category: categories })
            .from(posts)
            .innerJoin(user, eq(posts.authorId, user.id))
            .innerJoin(categories, eq(posts.categoryId, categories.id))
            .where(
                category
                    ? and(eq(posts.status, "published"), eq(categories.slug, category))
                    : eq(posts.status, "published")
            )
            .orderBy(desc(posts.createdAt))

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

        // 3) 疊上請求語系的標題 / 摘要 / 內文與分類名稱（無譯文時 fallback 原文）
        const { items } = await localizePosts(rows.map((r) => r.post), locale);
        const categoryNames = await localizedCategories(rows.map((r) => r.category.id), locale);

        // 4) 直接回傳資料庫原始欄位（不重新命名），並把 author/category/tags 附加上去
        // summary 為 null 時，從 content 自動產生純文字摘要
        const result = await Promise.all(
            rows.map(async (r, i) => {
                const { author, category } = r;
                const post = items[i]!;
                const tags = tagsByPost.get(String(post.id)) ?? [];
                const summary = post.summary ?? await mdxToExcerpt(post.content);

                return {
                    ...post,
                    summary,
                    author,
                    category: { ...category, ...categoryNames.get(category.id) },
                    tags,
                };
            })
        );

        return {
            status: "success",
            message: "文章列表取得成功",
            meta: undefined,
            data: result,
        }
    });

// 獲取單篇文章
const getPost = publicProcedure
    .route({ method: "GET", path: "/posts/{id}" })
    .input(z.object({ id: z.string(), ...localeInput }))
    .output(PostResponseSchema)
    .handler(async ({ input }) => {
        const { id, locale } = input;
        console.log(`Fetching post with id: ${id}`);
        // 1) 先用 left join 取得 post、author、category（若有）
        const [row] = await db
            .select({ post: posts, author: user, category: categories })
            .from(posts)
            .innerJoin(user, eq(posts.authorId, user.id))
            .innerJoin(categories, eq(posts.categoryId, categories.id))
            .where(and(eq(posts.slug, id), eq(posts.status, "published")))
            .limit(1);

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

        const { author, category } = row;
        const { items, chosen } = await localizePosts([row.post], locale);
        const post = items[0]!;
        const categoryName = (await localizedCategories([category.id], locale)).get(category.id);
        // 預編譯結果（hast JSON）：前端可直接渲染；編譯失敗時為 null，前端自行退回編譯 content
        const translationId = chosen.get(post.id);
        const compiled = translationId ? await ensureCompiled("post", translationId) : null;

        return {
            status: "success",
            message: "文章取得成功",
            meta: undefined,
            data: {
                ...post,
                compiled: compiled?.compiled ?? null,
                toc: compiled?.toc ?? null,
                readingTime: compiled?.readingTime ?? null,
                author,
                category: { ...category, ...categoryName },
                tags: tagsByPost,
            },
        };
    });

export default {
    getPosts,
    getPost
};