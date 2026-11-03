import { Fragment, type ReactNode } from 'react'

// 三語字串裡要嵌元件（篇名連結、節氣）：參數先傳記號 \u0001名字\u0001，翻好的字串再照記號切開、換成元件。
// 句子的語序留給每個語系自己決定。
export function rich(text: string, parts: Record<string, ReactNode>): ReactNode {
  return text.split('\u0001').map((piece, i) => <Fragment key={i}>{i % 2 ? (parts[piece] ?? piece) : piece}</Fragment>)
}

export const token = (name: string) => `\u0001${name}\u0001`
