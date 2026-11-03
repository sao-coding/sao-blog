import { describe, expect, test } from 'bun:test'
import type { Element, Root, RootContent } from 'hast'
import { compileMdx } from './compile'

const findImages = (node: Root | Element, out: Element[] = []) => {
  for (const child of node.children as RootContent[]) {
    if (child.type !== 'element') continue
    if (child.tagName === 'img') out.push(child)
    else findImages(child, out)
  }
  return out
}

const source = '![甲](https://example.com/a.jpg)\n\n<Carousel>\n  <Slide>![乙](https://example.com/b.jpg)</Slide>\n</Carousel>\n\n![丙](https://example.com/missing.jpg)'

describe('imageMeta', () => {
  test('有 resolver 時補上 width / height / dataBlur，抓不到的圖保持原樣', async () => {
    const result = await compileMdx(source, {
      imageMeta: async (src) =>
        src.endsWith('missing.jpg') ? null : { width: 800, height: src.endsWith('a.jpg') ? 1000 : 450, blur: 'data:image/webp;base64,AAAA' },
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const [a, b, c] = findImages(result.compiled.tree as unknown as Root)
    expect(a!.properties).toMatchObject({ width: 800, height: 1000, dataBlur: 'data:image/webp;base64,AAAA' })
    expect(b!.properties).toMatchObject({ width: 800, height: 450 })
    expect(c!.properties.width).toBeUndefined()
  })

  test('resolver 丟錯時不影響編譯', async () => {
    const result = await compileMdx(source, {
      imageMeta: async () => {
        throw new Error('network down')
      },
    })
    expect(result.ok).toBe(true)
  })

  test('沒有 resolver 時不加尺寸', async () => {
    const result = await compileMdx(source)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    for (const img of findImages(result.compiled.tree as unknown as Root)) expect(img.properties.width).toBeUndefined()
  })
})
