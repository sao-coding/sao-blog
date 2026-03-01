import React, { Suspense } from 'react'
import type { MDXComponents } from 'next-mdx-remote-client/rsc'
import type { TocItem } from 'remark-flexible-toc'

import { ErrorComponent, LoadingComponent } from '..'
import {
  defaultMDXComponents,
  mergeMDXComponents,
  type MDXComponentOverrides,
} from './index'
import Loading from '../ui/loading'

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

interface MdxRendererProps {
  content: React.ReactNode
  error?: Error
  components?: MDXComponentOverrides
}

const MdxRenderer = async ({
  content,
  error,
  components: componentOverrides,
}: MdxRendererProps) => {
  if (error) {
    return <ErrorComponent error={error.message} />
  }

  return <Suspense fallback={<Loading />}>{content}</Suspense>
}

// 建立合併後的 components 的工具函式
export const createMergedComponents = (
  overrides?: MDXComponentOverrides
): MDXComponents => {
  return mergeMDXComponents(defaultMDXComponents, overrides)
}

// 向後相容的 components 匯出
export const components = defaultMDXComponents

export { MdxRenderer }
