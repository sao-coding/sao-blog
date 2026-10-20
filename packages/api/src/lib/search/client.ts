import { buildSearchParams, parseSearchResponse, type SearchDocument, type SearchQuery, type SearchResult, type RawSearchResponse } from "./query";

// 伺服器端用的最小 Typesense client（只用到的幾個 REST 端點，直接 fetch，不額外裝 SDK）。
// 以 interface 抽出，測試時可換成記憶體實作。

export interface CollectionSchema {
  name: string;
  fields: Array<Record<string, unknown>>;
  default_sorting_field?: string;
}

export interface SearchClient {
  createCollection(schema: CollectionSchema): Promise<void>;
  deleteCollection(name: string): Promise<void>;
  /** 不存在回傳 null */
  getCollection(name: string): Promise<{ name: string; numDocuments: number } | null>;
  /** 不存在回傳 null */
  getAlias(alias: string): Promise<string | null>;
  upsertAlias(alias: string, collection: string): Promise<void>;
  /** 批次 upsert；回傳失敗筆數 */
  importDocuments(collection: string, docs: SearchDocument[]): Promise<{ failed: number }>;
  upsertDocument(collection: string, doc: SearchDocument): Promise<void>;
  deleteByFilter(collection: string, filterBy: string): Promise<void>;
  search(collection: string, query: SearchQuery): Promise<SearchResult>;
}

export interface TypesenseConfig {
  host: string;
  port: number;
  protocol: "http" | "https";
  apiKey: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

export class TypesenseError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function createTypesenseClient(config: TypesenseConfig): SearchClient {
  const base = `${config.protocol}://${config.host}:${config.port}`;
  const doFetch = config.fetch ?? fetch;
  const enc = encodeURIComponent;

  async function request(method: string, path: string, body?: unknown, contentType = "application/json") {
    const res = await doFetch(`${base}${path}`, {
      method,
      headers: { "X-TYPESENSE-API-KEY": config.apiKey, "Content-Type": contentType },
      body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
      signal: AbortSignal.timeout(config.timeoutMs ?? 10_000),
    });
    if (!res.ok) {
      throw new TypesenseError(res.status, `Typesense ${method} ${path} → ${res.status}: ${await res.text()}`);
    }
    return res;
  }

  const orNull = async <T>(fn: () => Promise<T>): Promise<T | null> => {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof TypesenseError && error.status === 404) return null;
      throw error;
    }
  };

  return {
    async createCollection(schema) {
      await request("POST", "/collections", schema);
    },
    async deleteCollection(name) {
      await orNull(() => request("DELETE", `/collections/${enc(name)}`));
    },
    getCollection: (name) =>
      orNull(async () => {
        const json = (await (await request("GET", `/collections/${enc(name)}`)).json()) as {
          name: string;
          num_documents: number;
        };
        return { name: json.name, numDocuments: json.num_documents };
      }),
    getAlias: (alias) =>
      orNull(async () => {
        const json = (await (await request("GET", `/aliases/${enc(alias)}`)).json()) as { collection_name: string };
        return json.collection_name;
      }),
    async upsertAlias(alias, collection) {
      await request("PUT", `/aliases/${enc(alias)}`, { collection_name: collection });
    },
    async importDocuments(collection, docs) {
      if (!docs.length) return { failed: 0 };
      const jsonl = docs.map((d) => JSON.stringify(d)).join("\n");
      const res = await request("POST", `/collections/${enc(collection)}/documents/import?action=upsert`, jsonl, "text/plain");
      const lines = (await res.text()).split("\n").filter(Boolean);
      const failed = lines.filter((l) => !(JSON.parse(l) as { success: boolean }).success);
      if (failed.length) console.error("[search] import 部分失敗:", failed.slice(0, 5).join("\n"));
      return { failed: failed.length };
    },
    async upsertDocument(collection, doc) {
      await request("POST", `/collections/${enc(collection)}/documents?action=upsert`, doc);
    },
    async deleteByFilter(collection, filterBy) {
      await orNull(() => request("DELETE", `/collections/${enc(collection)}/documents?filter_by=${enc(filterBy)}`));
    },
    async search(collection, query) {
      const qs = new URLSearchParams(buildSearchParams(query));
      const res = await request("GET", `/collections/${enc(collection)}/documents/search?${qs}`);
      return parseSearchResponse((await res.json()) as RawSearchResponse);
    },
  };
}
