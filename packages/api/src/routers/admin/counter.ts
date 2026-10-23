import { protectedProcedure } from "@sao-blog/api/index";
import z from "zod";
import { COUNTER_TYPES, recountCounters } from "../../lib/post-counters";

// 重算「由其他資料推算出來的計數器」。計數器是另外維護的，萬一漏算（程式錯誤、直接改資料庫）可一鍵校正。
const recount = protectedProcedure
    .route({
        method: "POST",
        path: "/counters/recount",
        summary: "重算計數器。type 可選 postComments / commentReactions / categoryPosts / tagPosts / topicNotes，或 all（預設，全部）。閱讀數是累加值，無法重算。",
    })
    .input(z.object({ type: z.enum([...COUNTER_TYPES, "all"]).default("all") }).default({ type: "all" }))
    .handler(async ({ input }) => {
        const results = await recountCounters(input.type);
        const fixed = results.reduce((n, r) => n + r.fixed, 0);
        return {
            status: "success",
            message: fixed === 0 ? "計數器都是正確的" : `已修正 ${fixed} 筆`,
            data: results,
        };
    });

export default { recount };
