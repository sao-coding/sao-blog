import { publicProcedure } from "@sao-blog/api/index";
import z from "zod";
import { getSearchClient } from "../lib/search";
import { SEARCH_LOCALES, searchAlias, type SearchResult } from "../lib/search/query";
import { localeSchema } from "../schema/i18n";

// 公開的全文搜尋（Typesense proxy）。前台 / App / MCP 共用；
// 會被 MCP 自動註冊成 content_search，summary 即工具說明。

const search = publicProcedure
  .route({
    method: "GET",
    path: "/search",
    summary:
      "全文搜尋已發布的文章與日記（標題 / 目錄標題 / 摘要 / 內文，權重依序遞減）。" +
      "locale 指定搜尋哪個語言版本（zh-TW / en / ja，預設 zh-TW），allLocales: true 則搜尋所有語言；" +
      "type 可限定 post 或 note。回傳標題、slug（日記為 id）、高亮片段（命中字以 <mark> 標示）。" +
      "適合發文前查相關舊文、建立內部連結。文章網址為 /posts/{slug}，日記為 /notes/{slug}，非 zh-TW 需加語系前綴（如 /en/posts/{slug}）。" +
      "回傳 enabled: false 表示伺服器未設定搜尋。",
  })
  .input(
    z.object({
      q: z.string().trim().min(1).max(200),
      locale: localeSchema.default("zh-TW"),
      allLocales: z.boolean().default(false),
      type: z.enum(["post", "note"]).optional(),
      page: z.coerce.number().int().min(1).max(100).default(1),
      perPage: z.coerce.number().int().min(1).max(50).default(10),
    }),
  )
  .handler(async ({ input }) => {
    const client = getSearchClient();
    if (!client) {
      return { status: "success", message: "搜尋功能未啟用", data: { enabled: false, found: 0, page: 1, hits: [] } };
    }
    const query = { q: input.q, type: input.type, page: input.page, perPage: input.perPage };
    try {
      let result: SearchResult;
      if (input.allLocales) {
        const results = await Promise.all(SEARCH_LOCALES.map((l) => client.search(searchAlias(l), query)));
        result = {
          found: results.reduce((n, r) => n + r.found, 0),
          page: input.page,
          hits: results.flatMap((r) => r.hits),
        };
      } else {
        result = await client.search(searchAlias(input.locale), query);
      }
      return { status: "success", message: "搜尋成功", data: { enabled: true, ...result } };
    } catch (error) {
      console.error("[search] 查詢失敗:", error);
      return { status: "error", message: "搜尋服務暫時無法使用", data: { enabled: true, found: 0, page: input.page, hits: [] } };
    }
  });

export default { search };
