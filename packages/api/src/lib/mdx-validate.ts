import { compileMdx, type CompileError, type CompileProfile } from "@sao-blog/mdx";
import { mdxToExcerpt } from "./mdx-to-text";

export const formatMdxErrors = (errors: CompileError[]) =>
  errors
    .map((e) => (e.line ? `第 ${e.line} 行${e.column ? `:${e.column}` : ""}：${e.message}` : e.message))
    .join("\n");

const excerpt = (text: string, maxLength = 160) =>
  text.length <= maxLength ? text : text.slice(0, maxLength).trimEnd() + "…";

export type MdxCheck =
  | { ok: true; summary: string; warning?: undefined }
  | { ok: true; summary: string; warning: string }
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
  const result = await compileMdx(content, { profile });
  const hasSummary = !!summary && summary.trim() !== "";

  if (result.ok) {
    return { ok: true, summary: hasSummary ? summary! : excerpt(result.plainText) };
  }

  const detail = formatMdxErrors(result.errors);
  if (publish) {
    return { ok: false, message: `MDX 內容有錯誤，未儲存：\n${detail}` };
  }
  return {
    ok: true,
    summary: hasSummary ? summary! : await mdxToExcerpt(content).catch(() => ""),
    warning: `草稿已儲存，但 MDX 有錯誤，發布前需修正：\n${detail}`,
  };
}
