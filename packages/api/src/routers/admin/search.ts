import { protectedProcedure } from "@sao-blog/api/index";
import { getSearchClient, getSearchDeps } from "../../lib/search";
import { getIndexStatus, reindexAll, runtimeStatus } from "../../lib/search/indexer";

// 後台搜尋索引管理（MCP：admin_search_getStatus / admin_search_reindexAll）

const getStatus = protectedProcedure
  .route({
    method: "GET",
    path: "/search/status",
    summary: "搜尋索引狀態：是否啟用、各語系 collection 文件數與最後重建時間、最近一次同步 / 重建結果。",
  })
  .handler(async () => {
    const client = getSearchClient();
    if (!client) {
      return { status: "success", message: "搜尋未啟用", data: { enabled: false, healthy: false, locales: [], ...runtimeStatus } };
    }
    try {
      const { locales } = await getIndexStatus(client);
      return { status: "success", message: "索引狀態取得成功", data: { enabled: true, healthy: true, locales, ...runtimeStatus } };
    } catch (error) {
      console.error("[search] 取得索引狀態失敗:", error);
      return {
        status: "error",
        message: `無法連線 Typesense：${error instanceof Error ? error.message : String(error)}`,
        data: { enabled: true, healthy: false, locales: [], ...runtimeStatus },
      };
    }
  });

const reindex = protectedProcedure
  .route({
    method: "POST",
    path: "/search/reindex",
    summary:
      "全量重建搜尋索引（零停機：建立新 collection、寫入所有已發布內容後切換 alias）。schema 變更或同步失敗後使用。",
  })
  .handler(async () => {
    const deps = getSearchDeps();
    if (!deps) return { status: "error", message: "搜尋未啟用（未設定 TYPESENSE_HOST / TYPESENSE_ADMIN_API_KEY）", data: null };
    try {
      const result = await reindexAll(deps);
      return { status: "success", message: "索引重建完成", data: result };
    } catch (error) {
      console.error("[search] 重建索引失敗:", error);
      return { status: "error", message: `索引重建失敗：${error instanceof Error ? error.message : String(error)}`, data: null };
    }
  });

export default { getStatus, reindexAll: reindex };
