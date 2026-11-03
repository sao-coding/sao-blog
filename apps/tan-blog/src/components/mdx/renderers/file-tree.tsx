import React from 'react'
import { FileIcon, FolderIcon, FolderOpenIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// 從作者寫的 markdown 巢狀清單解析出來的一個節點
interface TreeNode {
  name: string
  note: React.ReactNode[]
  isDir: boolean
  highlight: boolean
  children: TreeNode[]
}

type AnyElement = React.ReactElement<{ children?: React.ReactNode }>

const isElement = (node: React.ReactNode, type?: string): node is AnyElement =>
  React.isValidElement(node) && (type === undefined || node.type === type)

const childrenOf = (node: AnyElement) => React.Children.toArray(node.props.children)

const textOf = (node: React.ReactNode): string =>
  typeof node === 'string' || typeof node === 'number'
    ? String(node)
    : isElement(node)
      ? childrenOf(node).map(textOf).join('')
      : Array.isArray(node)
        ? node.map(textOf).join('')
        : ''

function parseItem(li: AnyElement): TreeNode | null {
  // 鬆散清單（項目之間有空行）時內容會包在 <p> 裡，攤平成同一層
  const parts = childrenOf(li).flatMap((child) =>
    isElement(child, 'p') ? childrenOf(child) : [child]
  )
  const nested = parts.filter((child) => isElement(child, 'ul'))
  const inline = parts.filter(
    (child) => !isElement(child, 'ul') && !(typeof child === 'string' && child.trim() === '')
  )
  if (inline.length === 0) return null

  let name: string
  let highlight = false
  let note: React.ReactNode[]
  const [first, ...rest] = inline
  if (isElement(first, 'strong')) {
    // **粗體** 的名稱＝重點檔案
    name = textOf(first).trim()
    highlight = true
    note = rest
  } else {
    // 第一個空白之前是名稱，之後（含其他行內元素）都是註解
    const text = typeof first === 'string' ? first.trimStart() : textOf(first)
    const space = text.search(/\s/)
    name = space === -1 ? text : text.slice(0, space)
    const remainder = space === -1 ? '' : text.slice(space).trim()
    note = [...(remainder ? [remainder] : []), ...rest]
  }

  const children = nested.flatMap((ul) => parseList(ul))
  const isDir = children.length > 0 || name.endsWith('/')
  return { name: name.replace(/\/$/, ''), note, isDir, highlight, children }
}

function parseList(ul: AnyElement): TreeNode[] {
  return childrenOf(ul)
    .filter((child): child is AnyElement => isElement(child, 'li'))
    .map(parseItem)
    .filter((node): node is TreeNode => node !== null)
}

function Entry({ node }: { node: TreeNode }) {
  const placeholder = node.name === '…' || node.name === '...'
  const label = (
    <>
      <span className="mdx-tree-name" data-highlight={node.highlight || undefined}>
        {placeholder ? '…' : node.name}
        {node.isDir && !placeholder && <span className="mdx-tree-slash">/</span>}
      </span>
      {node.note.length > 0 && <span className="mdx-tree-note">{node.note}</span>}
    </>
  )

  if (!node.isDir) {
    return (
      <li className="mdx-tree-item">
        <span className="mdx-tree-row">
          {placeholder ? <span className="mdx-tree-icon" /> : <FileIcon className="mdx-tree-icon" aria-hidden />}
          {label}
        </span>
      </li>
    )
  }

  // 資料夾用原生 <details>：不用 JS 就能收合，鍵盤也能操作
  return (
    <li className="mdx-tree-item">
      <details open>
        <summary className="mdx-tree-row">
          <FolderIcon className="mdx-tree-icon mdx-tree-closed" aria-hidden />
          <FolderOpenIcon className="mdx-tree-icon mdx-tree-open" aria-hidden />
          {label}
        </summary>
        {node.children.length > 0 && <Tree nodes={node.children} />}
      </details>
    </li>
  )
}

function Tree({ nodes }: { nodes: TreeNode[] }) {
  return (
    <ul className="mdx-tree">
      {nodes.map((node, index) => (
        <Entry key={index} node={node} />
      ))}
    </ul>
  )
}

/**
 * 檔案樹。作者寫 markdown 巢狀清單，這裡轉成帶資料夾圖示、縮排導線、可收合的樹。
 *
 * ```mdx
 * <FileTree>
 * - src/
 *   - routes/
 *     - **index.tsx** 首頁
 *     - …
 *   - styles.css
 * - vite.config.ts 建置設定
 * </FileTree>
 * ```
 */
export const MdxFileTree = ({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) => {
  const nodes = React.Children.toArray(children)
    .filter((child): child is AnyElement => isElement(child, 'ul'))
    .flatMap(parseList)

  if (nodes.length === 0) return null

  return (
    <div className={cn('mdx-block mdx-frame mdx-filetree not-prose', className)}>
      <Tree nodes={nodes} />
    </div>
  )
}
