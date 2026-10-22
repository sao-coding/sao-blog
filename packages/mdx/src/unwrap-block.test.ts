import { describe, expect, test } from 'bun:test'
import { compileMdx } from './compile'
import type { HastJsonElement } from './types'

const firstChild = async (source: string) => {
  const result = await compileMdx(source)
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error('compile failed')
  return result.compiled.tree.children[0] as HastJsonElement
}

describe('單行區塊元件', () => {
  test.each([
    '<Quote author="魯迅">世上本沒有路</Quote>',
    '<StickyNote color="pink">記得買牛奶</StickyNote>',
    '<Alert type="info">提醒</Alert>',
  ])('不被 <p> 包住：%s', async (source) => {
    const el = await firstChild(source)
    expect(el.tagName).toBe(source.slice(1, source.search(/[ >]/)))
  })

  test('行內元件仍留在 <p> 裡', async () => {
    const el = await firstChild('<Kbd>Ctrl</Kbd>')
    expect(el.tagName).toBe('p')
    expect((el.children[0] as HastJsonElement).tagName).toBe('Kbd')
  })

  test('與其他文字同段時不拆', async () => {
    const el = await firstChild('前文 <Mark>重點</Mark> 後文')
    expect(el.tagName).toBe('p')
  })
})
