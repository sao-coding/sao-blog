import React from 'react'
import { Kbd } from '@sao-blog/ui/components/kbd'

// 行內小元件：會出現在 <p> 裡，只能輸出 phrasing content（span／kbd／ruby），不能有 div

/**
 * 鍵盤按鍵。`<Kbd>Ctrl</Kbd>+<Kbd>K</Kbd>`；直接寫小寫 <kbd> 也是同樣樣式。
 * 用共用的 Kbd，外觀由 blocks.css 的 .mdx-kbd 改成鍵帽（尺寸用 em，跟著所在文字縮放）；
 * 文章裡的按鍵要能選取複製，所以拿掉共用元件預設的 select-none / pointer-events-none
 */
export const MdxKbd = ({ children }: { children?: React.ReactNode }) => (
  <Kbd className="mdx-kbd pointer-events-auto select-text">{children}</Kbd>
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
