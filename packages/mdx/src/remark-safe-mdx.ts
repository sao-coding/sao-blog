import type { Expression, Program, SpreadElement } from 'estree'
import type { Nodes, Parent, Root } from 'mdast'
import type {
  MdxJsxAttribute,
  MdxJsxExpressionAttribute,
  MdxJsxFlowElement,
  MdxJsxTextElement,
} from 'mdast-util-mdx'
import type { VFile } from 'vfile'
import {
  allowedHtmlTags,
  componentRegistry,
  isRegisteredComponent,
} from './registry'
import type { CompileError } from './types'

/**
 * 把 MDX 收斂成「純資料」子集合，讓編譯結果能存成 hast JSON：
 *
 * - `import` / `export` → 錯誤
 * - `{表達式}` → 錯誤（`{/* 註解 *\/}` 例外，直接移除）
 * - JSX 元件必須在 registry 內，props 依 zod schema 驗證
 * - JSX 屬性值只接受字面值（字串、數字、布林、陣列、物件），不執行任何程式碼
 * - 小寫 HTML 標籤需在白名單內，且不得有事件處理器 / javascript: 連結
 *
 * 通過驗證的 JSX 節點會設好 `data.hName` / `data.hProperties`，
 * 由 remark-rehype 直接轉成一般 hast element。
 */

type JsxNode = MdxJsxFlowElement | MdxJsxTextElement

const getErrors = (file: VFile): CompileError[] =>
  ((file.data as { mdxErrors?: CompileError[] }).mdxErrors ??= [])

export const getMdxErrors = (file: VFile): CompileError[] => getErrors(file)

class LiteralError extends Error {}

function evalLiteral(node: Expression | SpreadElement | null): unknown {
  if (!node) throw new LiteralError('陣列不能有空位')
  switch (node.type) {
    case 'Literal':
      if ('regex' in node || 'bigint' in node) {
        throw new LiteralError('不支援正規表達式 / BigInt')
      }
      return node.value
    case 'TemplateLiteral':
      if (node.expressions.length > 0) {
        throw new LiteralError('樣板字串不能內嵌表達式')
      }
      return node.quasis.map((q) => q.value.cooked ?? '').join('')
    case 'UnaryExpression': {
      if (node.operator !== '-' && node.operator !== '+') break
      const value = evalLiteral(node.argument)
      if (typeof value !== 'number') break
      return node.operator === '-' ? -value : value
    }
    case 'ArrayExpression':
      return node.elements.map((el) => evalLiteral(el))
    case 'ObjectExpression': {
      const out: Record<string, unknown> = {}
      for (const prop of node.properties) {
        if (prop.type !== 'Property' || prop.kind !== 'init' || prop.computed) {
          throw new LiteralError('物件只能包含一般的 key: value')
        }
        const key =
          prop.key.type === 'Identifier'
            ? prop.key.name
            : prop.key.type === 'Literal'
              ? String(prop.key.value)
              : undefined
        if (key === undefined) throw new LiteralError('不支援的物件 key')
        out[key] = evalLiteral(prop.value as Expression)
      }
      return out
    }
  }
  throw new LiteralError(`只接受字面值，不支援 ${node.type}`)
}

const getProgram = (data: unknown): Program | undefined =>
  (data as { estree?: Program } | undefined)?.estree

function attributeValue(attr: MdxJsxAttribute): unknown {
  const { value } = attr
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value
  const program = getProgram(value.data)
  const statement = program?.body[0]
  if (!program || program.body.length !== 1 || statement?.type !== 'ExpressionStatement') {
    throw new LiteralError(`屬性 ${attr.name} 的值無法解析`)
  }
  return evalLiteral(statement.expression)
}

const toKebab = (key: string) =>
  key.startsWith('--') ? key : key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)

// 與 React 相同：數字預設補 px，少數無單位屬性除外
const UNITLESS = new Set([
  'flex', 'flexGrow', 'flexShrink', 'fontWeight', 'lineHeight', 'opacity',
  'order', 'zIndex', 'zoom', 'gridRow', 'gridColumn', 'aspectRatio',
])

function styleToString(style: Record<string, unknown>) {
  return Object.entries(style)
    .map(([key, value]) => {
      const css =
        typeof value === 'number' && value !== 0 && !UNITLESS.has(key)
          ? `${value}px`
          : String(value)
      return `${toKebab(key)}:${css}`
    })
    .join(';')
}

const UNSAFE_URL = /^\s*(javascript|vbscript|data:text\/html)/i

function hasMeaningfulChildren(node: JsxNode) {
  return node.children.some(
    (child) => !(child.type === 'text' && child.value.trim() === '')
  )
}

function processJsx(node: JsxNode, file: VFile) {
  const errors = getErrors(file)
  const at = node.position?.start
  const report = (message: string) =>
    errors.push({ line: at?.line, column: at?.column, message })

  const name = node.name
  if (!name) {
    report('不支援 JSX Fragment（<>…</>）')
    return false
  }

  const props: Record<string, unknown> = {}
  for (const attr of node.attributes as (MdxJsxAttribute | MdxJsxExpressionAttribute)[]) {
    if (attr.type === 'mdxJsxExpressionAttribute') {
      report(`<${name}> 不支援展開屬性 {...}`)
      return false
    }
    try {
      props[attr.name] = attributeValue(attr)
    } catch (err) {
      report(`<${name}> ${err instanceof Error ? err.message : String(err)}`)
      return false
    }
  }

  if (isRegisteredComponent(name)) {
    const spec = componentRegistry[name]
    const parsed = spec.props.safeParse(props)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.')
        report(`<${name}>${path ? ` 屬性 ${path}` : ''}：${issue.message}`)
      }
      return false
    }
    if (!spec.children && hasMeaningfulChildren(node)) {
      report(`<${name}> 不接受子內容`)
      return false
    }
    node.data = { ...node.data, hName: name, hProperties: parsed.data as never }
    return true
  }

  if (/^[A-Z]/.test(name) || name.includes('.')) {
    report(`未知的元件 <${name}>`)
    return false
  }
  if (!allowedHtmlTags.has(name)) {
    report(`不允許的 HTML 標籤 <${name}>`)
    return false
  }

  for (const [key, value] of Object.entries(props)) {
    if (/^on/i.test(key) || key === 'dangerouslySetInnerHTML') {
      report(`<${name}> 不允許屬性 ${key}`)
      return false
    }
    if ((key === 'href' || key === 'src') && typeof value === 'string' && UNSAFE_URL.test(value)) {
      report(`<${name}> 的 ${key} 不安全`)
      return false
    }
    if (key === 'style' && value && typeof value === 'object') {
      props[key] = styleToString(value as Record<string, unknown>)
    } else if (value !== null && typeof value === 'object') {
      report(`<${name}> 屬性 ${key} 只能是字串、數字或布林`)
      return false
    }
  }
  node.data = { ...node.data, hName: name, hProperties: props as never }
  return true
}

function walk(parent: Parent, file: VFile) {
  const errors = getErrors(file)
  for (let i = parent.children.length - 1; i >= 0; i--) {
    const node = parent.children[i] as Nodes
    const at = node.position?.start
    switch (node.type) {
      case 'mdxjsEsm':
        errors.push({
          line: at?.line,
          column: at?.column,
          message: '不支援 import / export',
        })
        parent.children.splice(i, 1)
        continue
      case 'mdxFlowExpression':
      case 'mdxTextExpression': {
        const program = getProgram(node.data)
        // `{/* 註解 */}`：estree 沒有任何 statement，視為註解直接移除
        if (!program || program.body.length > 0) {
          errors.push({
            line: at?.line,
            column: at?.column,
            message: `不支援 JS 表達式 {${node.value}}`,
          })
        }
        parent.children.splice(i, 1)
        continue
      }
      case 'mdxJsxFlowElement':
      case 'mdxJsxTextElement':
        processJsx(node, file)
        break
    }
    if ('children' in node) walk(node, file)
  }
}

export function remarkSafeMdx() {
  return (tree: Root, file: VFile) => {
    getErrors(file)
    walk(tree, file)
  }
}
