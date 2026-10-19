import type { Element, Root as HastRoot, RootContent } from 'hast'
import rehypeKatex from 'rehype-katex'
import rehypeSlug from 'rehype-slug'
import remarkBreaks from 'remark-breaks'
import remarkFlexibleToc from 'remark-flexible-toc'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkMdx from 'remark-mdx'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified, type Processor } from 'unified'
import { VFile } from 'vfile'
import { matter } from 'vfile-matter'
import { DIAGRAM_LANGS, getLanguage, rehypeCodeHighlight } from './highlight'
import { componentRegistry, isRegisteredComponent } from './registry'
import { getMdxErrors, remarkSafeMdx } from './remark-safe-mdx'
import {
  COMPILED_VERSION,
  type CompileError,
  type CompileProfile,
  type CompileResult,
  type TocItem,
} from './types'

type HastProcessor = Processor<any, any, HastRoot, HastRoot, undefined>

const processors = new Map<CompileProfile, HastProcessor>()

function getProcessor(profile: CompileProfile): HastProcessor {
  let processor = processors.get(profile)
  if (processor) return processor

  // post：完整功能（數學 / KaTeX）；note：日記只需 GFM、換行與 slug
  const base = unified()
    .use(remarkParse)
    .use(remarkMdx)
    .use(remarkSafeMdx)
    .use(remarkGfm)
    .use(remarkBreaks)
  if (profile === 'post') base.use(remarkMath)
  base.use(remarkFlexibleToc).use(remarkRehype)
  if (profile === 'post') base.use(rehypeKatex)
  base.use(rehypeSlug).use(rehypeCodeHighlight)

  processor = base.freeze() as unknown as HastProcessor
  processors.set(profile, processor)
  return processor
}

export async function hashSource(source: string): Promise<string> {
  const bytes = new TextEncoder().encode(source)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, '0')
  ).join('')
}

/** 中日文以字計、其他語言以詞計，分別用 400 字/分、200 詞/分估算 */
export function estimateReadingTime(text: string): number {
  const cjk = text.match(/[぀-ヿ㐀-鿿豈-﫿]/g)?.length ?? 0
  const words = text
    .replace(/[぀-ヿ㐀-鿿豈-﫿]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length
  return Math.max(1, Math.ceil(cjk / 400 + words / 200))
}

const isComponentTag = (tagName: string) => /^[A-Z]/.test(tagName)

/** 移除 position / data（不屬於渲染契約），並清掉元件底下純空白的文字節點。 */
function cleanTree<T extends HastRoot | Element>(node: T): T {
  delete (node as { position?: unknown }).position
  delete (node as { data?: unknown }).data
  const dropWhitespace = node.type === 'element' && isComponentTag(node.tagName)
  node.children = (node.children as RootContent[]).filter((child) => {
    if (dropWhitespace && child.type === 'text' && child.value.trim() === '') {
      return false
    }
    if (child.type === 'element') cleanTree(child)
    else delete (child as { position?: unknown }).position
    return child.type !== 'doctype'
  }) as T['children']
  return node
}

const BLOCK_TAGS = new Set([
  'p', 'div', 'li', 'tr', 'pre', 'blockquote', 'table', 'ul', 'ol',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'br', 'figure', 'figcaption',
  'details', 'summary', 'dt', 'dd',
])

function collectText(node: HastRoot | RootContent, out: string[]) {
  if (node.type === 'text') {
    out.push(node.value)
    return
  }
  if (node.type !== 'element' && node.type !== 'root') return

  if (node.type === 'element') {
    const classes = node.properties.className
    if (Array.isArray(classes) && classes.includes('katex-mathml')) return
    if (node.tagName === 'pre') {
      const code = node.children.find(
        (c): c is Element => c.type === 'element' && c.tagName === 'code'
      )
      const lang = code && getLanguage(code)
      if (lang && DIAGRAM_LANGS.has(lang)) return
    }
    if (isRegisteredComponent(node.tagName)) {
      for (const prop of componentRegistry[node.tagName].translatableProps) {
        const value = node.properties[prop]
        if (typeof value === 'string') out.push(value, '\n')
      }
    }
  }

  for (const child of node.children) collectText(child, out)
  if (
    node.type === 'element' &&
    (BLOCK_TAGS.has(node.tagName) || isComponentTag(node.tagName))
  ) {
    out.push('\n')
  }
}

export function hastToPlainText(tree: HastRoot): string {
  const out: string[] = []
  collectText(tree, out)
  return out
    .join('')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
}

function toCompileError(err: unknown): CompileError {
  type Point = { line?: number; column?: number }
  const e = err as Point & {
    place?: Point | { start?: Point }
    reason?: string
    message?: string
  }
  const message = e.reason ?? e.message ?? String(err)
  // 部分 micromark 錯誤（例如未閉合的標籤）沒有 place，只把位置寫在訊息尾端 `(1:1-1:8)`
  const fromMessage = message.match(/\((\d+):(\d+)(?:-\d+:\d+)?\)$/)
  const point: Point | undefined =
    e.place && 'start' in e.place
      ? e.place.start
      : ((e.place as Point | undefined) ??
        (fromMessage
          ? { line: Number(fromMessage[1]), column: Number(fromMessage[2]) }
          : undefined))
  return {
    line: e.line ?? point?.line ?? undefined,
    column: e.column ?? point?.column ?? undefined,
    message,
  }
}

/**
 * 把 MDX 原文編譯成跨平台的 hast JSON。
 * 失敗時回傳所有錯誤（含行號），呼叫端應拒絕存檔，讓作者 / AI 依錯誤修正。
 */
export async function compileMdx(
  source: string,
  { profile = 'post' }: { profile?: CompileProfile } = {}
): Promise<CompileResult> {
  const hash = await hashSource(source)
  const file = new VFile({ value: source })

  try {
    matter(file, { strip: true })
  } catch (err) {
    return { ok: false, errors: [{ message: `frontmatter 解析失敗：${toCompileError(err).message}` }] }
  }

  const processor = getProcessor(profile)
  let tree: HastRoot
  try {
    tree = await processor.run(processor.parse(file), file)
  } catch (err) {
    return { ok: false, errors: [...getMdxErrors(file), toCompileError(err)] }
  }

  const errors = getMdxErrors(file)
  if (errors.length > 0) {
    errors.sort((a, b) => (a.line ?? 0) - (b.line ?? 0))
    return { ok: false, errors }
  }

  cleanTree(tree)
  const plainText = hastToPlainText(tree)
  const data = file.data as {
    toc?: (TocItem & { data?: unknown })[]
    matter?: Record<string, unknown>
  }

  return {
    ok: true,
    compiled: { v: COMPILED_VERSION, tree },
    toc: (data.toc ?? []).map(({ data: _data, ...item }) => item),
    plainText,
    readingTime: estimateReadingTime(plainText),
    hash,
    frontmatter: data.matter ?? {},
  }
}
