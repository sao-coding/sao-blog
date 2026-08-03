import { useMemo } from 'react'
import { runSync } from '@mdx-js/mdx'
import * as runtime from 'react/jsx-runtime'
import type { MDXComponents } from 'mdx/types'

type MdxContentProps = {
  compiledSource: string
  components?: MDXComponents
}

// 同一份元件在 SSR 與 hydration 都會被呼叫到，且是純同步 render（沒有
// Suspense/use()）：runSync 是 @mdx-js/mdx 專門給「已經在伺服器編譯好
// function-body 原始碼、現在只要同步執行它」這種情境設計的 API，
// 純函式、對同一個 compiledSource 一定吐出相同結果，因此 server/client
// 渲染出來的 HTML 會一致，不會有 hydration mismatch。
export function MdxContent({ compiledSource, components }: MdxContentProps) {
  const { default: Content } = useMemo(
    () =>
      runSync(compiledSource, {
        ...runtime,
        baseUrl: import.meta.url,
      }),
    [compiledSource]
  )

  return <Content components={components} />
}
