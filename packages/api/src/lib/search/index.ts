import { db } from "@sao-blog/db";
import { env } from "@sao-blog/env/server";
import { createTypesenseClient, type SearchClient } from "./client";
import { syncCategoryPosts, syncContents, type SearchDeps } from "./indexer";
import type { SearchContentType } from "./query";

// 正式環境的接線：env 有設定 Typesense 才啟用，否則所有同步 / 搜尋都略過。

let client: SearchClient | null | undefined;

export function getSearchClient(): SearchClient | null {
  if (client === undefined) {
    client =
      env.TYPESENSE_HOST && env.TYPESENSE_ADMIN_API_KEY
        ? createTypesenseClient({
            host: env.TYPESENSE_HOST,
            port: env.TYPESENSE_PORT,
            protocol: env.TYPESENSE_PROTOCOL,
            apiKey: env.TYPESENSE_ADMIN_API_KEY,
          })
        : null;
  }
  return client;
}

/** 測試用：替換 client（null = 停用） */
export function setSearchClient(next: SearchClient | null | undefined) {
  client = next;
}

export function getSearchDeps(): SearchDeps | null {
  const c = getSearchClient();
  return c ? { db, client: c } : null;
}

/** 存檔後背景同步（不 await、不丟錯）：未啟用搜尋時什麼都不做 */
export function queueSearchSync(type: SearchContentType, ids: string[]) {
  const deps = getSearchDeps();
  if (deps && ids.length) void syncContents(deps, type, ids);
}

export function queueCategorySearchSync(categoryId: string) {
  const deps = getSearchDeps();
  if (deps) void syncCategoryPosts(deps, categoryId);
}
