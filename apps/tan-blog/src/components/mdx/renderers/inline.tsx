import React from 'react'

// 行內小元件：會出現在 <p> 裡，只能輸出 phrasing content（span／kbd／ruby），不能有 div

/**
 * 鍵盤按鍵。`<Kbd>Ctrl</Kbd>+<Kbd>K</Kbd>`；直接寫小寫 <kbd> 也是同樣樣式。
 */
export const MdxKbd = ({ children }: { children?: React.ReactNode }) => (
  <kbd className="mdx-kbd">{children}</kbd>
)

/**
 * 注音／振假名：`<Ruby rt="かんじ">漢字</Ruby>`。
 * <rp> 的括號只在不支援 ruby 的環境（例如 RSS 閱讀器、純文字複製）出現。
 */
export const MdxRuby = ({ rt, children }: { rt: string; children?: React.ReactNode }) => (
  <ruby className="mdx-ruby">
    {children}
    <rp>(</rp>
    <rt>{rt}</rt>
    <rp>)</rp>
  </ruby>
)
