import type { EvaluateOptions } from 'next-mdx-remote-client/rsc'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import remarkFlexibleToc, { TocItem } from 'remark-flexible-toc'
import rehypeSlug from 'rehype-slug'
import { calculateSomeHow } from '@/utils'

type Scope = {
  readingTime: string
  toc?: TocItem[]
}

type Frontmatter = {
  title: string
  description?: string
  keywords?: string
  author: string
  date?: string
  showToc?: boolean
}

// 完整 MDX 配置（用於文章，包含 TOC、數學、KaTeX 等）
const getMdxOptions = (source: string): EvaluateOptions<Scope> => ({
  mdxOptions: {
    remarkPlugins: [remarkGfm, remarkMath, remarkFlexibleToc],
    rehypePlugins: [rehypeKatex, rehypeSlug],
  },
  parseFrontmatter: true,
  scope: {
    readingTime: calculateSomeHow(source),
  },
  vfileDataIntoScope: 'toc', // 這行會把 toc 注入 scope.toc
})

// 較輕量的 MDX 配置（用於日記/備註，只需要 GFM 與 slug）
export const getBasicMdxOptions = (source: string): EvaluateOptions<Scope> => ({
  mdxOptions: {
    remarkPlugins: [remarkGfm, remarkFlexibleToc],
    rehypePlugins: [rehypeSlug],
  },
  parseFrontmatter: true,
  scope: {
    readingTime: calculateSomeHow(source),
  },
  vfileDataIntoScope: 'toc', // 這行會把 toc 注入 scope.toc
})

export default getMdxOptions
