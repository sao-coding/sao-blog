/**
 * 將任意字串轉為 URL 安全的 slug，保留中文等 Unicode 文字字元。
 */
export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}
