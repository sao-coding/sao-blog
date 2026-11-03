import {
  compileMdx,
  hashSource,
  type CompileError,
  type CompileProfile,
  type CompiledContent,
  type TocItem,
} from "@sao-blog/mdx";
import { mdxToExcerpt } from "./mdx-to-text";
import { resolveImageMeta } from "./image-meta";

export const formatMdxErrors = (errors: CompileError[]) =>
  errors
    .map((e) => (e.line ? `第 ${e.line} 行${e.column ? `:${e.column}` : ""}：${e.message}` : e.message))
    .join("\n");

// 摘要是單行文字：plainText 的分段換行收成空白
const excerpt = (plainText: string, maxLength = 160) => {
  const text = plainText.replace(/\s*\n\s*/g, " ").trim();
  return text.length <= maxLength ? text : text.slice(0, maxLength).trimEnd() + "…";
};

/** 編譯產物，直接寫入 *_translations；編譯失敗（草稿）時全為 null，之後再重編 */
export interface MdxArtifacts {
  compiled: CompiledContent | null;
  toc: TocItem[] | null;
  plainText: string | null;
  readingTime: number | null;
  /** compiled 對應的內容 hash；未編譯成功為 null */
  compiledHash: string | null;
  /** 目前 content 的 hash（原文的 sourceHash） */
  hash: string;
}

export type MdxCheck =
  | { ok: true; summary: string; warning?: string; artifacts: MdxArtifacts }
  | { ok: false; message: string };

/**
 * 存檔前檢查 MDX：用前台同一條編譯管線（@sao-blog/mdx）驗證。
 *
 * - 發布（publish = true）時編譯失敗 → 回傳 ok: false，呼叫端應拒絕存檔，
 *   錯誤帶行號，讓作者 / AI 依錯誤自行修正
 * - 草稿編譯失敗 → 仍允許存檔（避免半成品存不了），附上 warning
 * - summary 未填時，用編譯產出的 plainText 截斷產生（失敗時退回舊的 mdxToExcerpt）
 */
export async function checkMdxForSave(
  content: string,
  {
    profile,
    publish,
    summary,
  }: { profile: CompileProfile; publish: boolean; summary?: string | null },
): Promise<MdxCheck> {
  // 存檔的編譯結果帶圖片尺寸與模糊預覽（前台用來佔位）
  const result = await compileMdx(content, { profile, imageMeta: resolveImageMeta });
  const hasSummary = !!summary && summary.trim() !== "";

  if (result.ok) {
    return {
      ok: true,
      summary: hasSummary ? summary! : excerpt(result.plainText),
      artifacts: {
        compiled: result.compiled,
        toc: result.toc,
        plainText: result.plainText,
        readingTime: result.readingTime,
        compiledHash: result.compiledHash,
        hash: result.hash,
      },
    };
  }

  const detail = formatMdxErrors(result.errors);
  if (publish) {
    return { ok: false, message: `MDX 內容有錯誤，未儲存：\n${detail}` };
  }
  return {
    ok: true,
    summary: hasSummary ? summary! : await mdxToExcerpt(content).catch(() => ""),
    warning: `草稿已儲存，但 MDX 有錯誤，發布前需修正：\n${detail}`,
    artifacts: {
      compiled: null,
      toc: null,
      plainText: null,
      readingTime: null,
      compiledHash: null,
      hash: await hashSource(content),
    },
  };
}
