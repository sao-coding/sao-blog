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

export async function mdxToText(mdx: string): Promise<string> {
  const file = await processor.process(mdx);
  return String(file).trim();
}

export function mdxToTextSync(mdx: string): string {
  const file = processor.processSync(mdx);
  return String(file).trim();
}
