import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMdx from "remark-mdx";
import stripMarkdown from "strip-markdown";
import remarkStringify from "remark-stringify";

const processor = unified()
  .use(remarkParse)
  .use(remarkMdx)
  .use(stripMarkdown)
  .use(remarkStringify);

/**
 * 將 MDX 字串轉換為純文字（async）
 */
export async function mdxToText(mdx: string): Promise<string> {
  const file = await processor.process(mdx);
  return String(file).trim();
}

/**
 * 將 MDX 字串截取為指定長度的純文字摘要
 * @param mdx MDX 原始內容
 * @param maxLength 最大字元數，預設 160
 */
export async function mdxToExcerpt(
  mdx: string,
  maxLength = 160
): Promise<string> {
  const text = await mdxToText(mdx);
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "…";
}
