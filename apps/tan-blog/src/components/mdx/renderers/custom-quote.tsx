'use client'

import React from 'react'

export interface CustomQuoteProps {
  children: React.ReactNode
  author?: string
  variant?: 'default' | 'warning' | 'info' | 'success'
}

// 對應 blocks.css 的 [data-tone]；default 不給值，沿用朱色
const variantTone: Record<NonNullable<CustomQuoteProps['variant']>, string | undefined> = {
  default: undefined,
  warning: 'amber',
  info: 'blue',
  success: 'green',
}

/**
 * 引言：左側一道細線、淡淡的大引號，內文用文楷（CJK 不用斜體），署名靠右。
 *
 * ```mdx
 * <CustomQuote author="魯迅">其實地上本沒有路，走的人多了，也便成了路。</CustomQuote>
 * ```
 */
export const CustomQuote = ({
  children,
  author,
  variant = 'default',
}: CustomQuoteProps) => (
  <figure className="mdx-block mdx-quote" data-tone={variantTone[variant] ?? ''}>
    <blockquote>{children}</blockquote>
    {author && <figcaption>—— {author}</figcaption>}
  </figure>
)
