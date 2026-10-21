import { useMemo } from 'react'
import { toJsxRuntime, type Components } from 'hast-util-to-jsx-runtime'
import { Fragment, jsx, jsxs } from 'react/jsx-runtime'
// 只匯入 registry / types 子路徑：這支檔案會進 client bundle，
// 不能把 compile（unified / shiki）整包帶進來。
import { isRegisteredComponent } from '@sao-blog/mdx/registry'
import {
  COMPILED_VERSION,
  type CompiledContent,
  type HastJsonElement,
  type HastJsonNode,
  type HastJsonRoot,
} from '@sao-blog/mdx/types'

import { ErrorComponent } from '@/components/index'
import { m } from '#/paraglide/messages'
import {
  defaultMDXComponents,
  mergeMDXComponents,
  type MDXComponentOverrides,
} from '@/components/mdx'
import { MdxUnknown } from '@/components/mdx/renderers/unknown'

/** 把 renderer 沒有實作的元件換成 MdxUnknown（回傳新 tree，不動到快取裡的原物件） */
function withFallbacks<T extends HastJsonRoot | HastJsonElement>(
  node: T,
  known: (name: string) => boolean
): T {
  const children = node.children.map((child): HastJsonNode => {
    if (child.type !== 'element') return child
    const next = withFallbacks(child, known)
    if (/^[A-Z]/.test(next.tagName) && !known(next.tagName)) {
      return { ...next, tagName: 'MdxUnknown', properties: { name: next.tagName } }
    }
    return next
  })
  return { ...node, children } as T
}

type CompiledMdxProps = {
  compiled: CompiledContent | null | undefined
  /** 依頁面覆寫 / 停用元件（null 或 false 停用，該區塊會降級顯示） */
  components?: MDXComponentOverrides
}

// 渲染伺服器端編譯好的 hast JSON。純同步、純資料走訪，不執行任何 MDX / JS，
// 對同一份 compiled 在 SSR 與 hydration 一定吐出相同結果，不會有 mismatch。
export function CompiledMdx({ compiled, components }: CompiledMdxProps) {
  const content = useMemo(() => {
    if (!compiled || compiled.v !== COMPILED_VERSION) return null

    // mergeMDXComponents 回傳新物件；wrapper 改由外層 div 處理
    const merged = mergeMDXComponents(defaultMDXComponents, components)
    delete merged.wrapper
    const known = (name: string) =>
      Object.hasOwn(merged, name) && isRegisteredComponent(name)

    // HastJsonRoot 是 hast 的 JSON 子集，可直接交給 hast-util-to-jsx-runtime
    const tree = withFallbacks(compiled.tree, known) as unknown as Parameters<typeof toJsxRuntime>[0]
    return toJsxRuntime(tree, {
      Fragment,
      jsx,
      jsxs,
      components: { ...merged, MdxUnknown } as unknown as Partial<Components>,
      passKeys: true,
      ignoreInvalidStyle: true,
    })
  }, [compiled, components])

  if (!content) {
    return <ErrorComponent error="內容格式版本不相容，請重新編譯。" />
  }
  // --mdx-figure-label：圖說編號前綴（圖／Fig.／図），CSS counter 的 content 用得到，所以以帶引號的字串傳進去
  return (
    <div
      className="mdx-wrapper text-lg"
      style={{ '--mdx-figure-label': JSON.stringify(m.mdx_figure_label()) } as React.CSSProperties}
    >
      {content}
    </div>
  )
}
