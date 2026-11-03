import { describe, expect, test } from 'bun:test'
import { compileMdx } from './compile'
import type { HastJsonElement } from './types'

const fence = (lang: string, meta: string, code: string) =>
  '```' + `${lang} ${meta}`.trimEnd() + '\n' + code + '\n```'

const playground = (attrs: string, ...fences: string[]) =>
  `<Playground ${attrs}>\n${fences.join('\n\n')}\n</Playground>\n`

describe('Playground', () => {
  test('code fence 轉成 PlaygroundFile 原始碼（不經 Shiki）', async () => {
    const result = await compileMdx(
      playground(
        'template="react" title="計數器" height={240}',
        fence('jsx', 'App.jsx', 'export default function App() {\n  return <h1>hi</h1>\n}'),
        fence('css', 'styles.css hidden', 'h1 { color: red }')
      )
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const el = result.compiled.tree.children[0] as HastJsonElement
    expect(el.tagName).toBe('Playground')
    expect(el.properties).toEqual({ template: 'react', title: '計數器', height: 240 })
    expect(el.children).toEqual([
      {
        type: 'element',
        tagName: 'PlaygroundFile',
        properties: { name: 'App.jsx', lang: 'jsx' },
        children: [
          { type: 'text', value: 'export default function App() {\n  return <h1>hi</h1>\n}' },
        ],
      },
      {
        type: 'element',
        tagName: 'PlaygroundFile',
        properties: { name: 'styles.css', lang: 'css', hidden: true },
        children: [{ type: 'text', value: 'h1 { color: red }' }],
      },
    ])
    // 原始碼不進純文字，但 title 會
    expect(result.plainText).toContain('計數器')
    expect(result.plainText).not.toContain('export default')
    // 純資料：可 JSON 來回
    expect(JSON.parse(JSON.stringify(result.compiled))).toEqual(result.compiled)
  })

  test('未標檔名時依語言給預設檔名', async () => {
    const result = await compileMdx(
      playground('template="html"', fence('html', '', '<p>hi</p>'), fence('javascript', '', 'console.log(1)'))
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const el = result.compiled.tree.children[0] as HastJsonElement
    expect(el.children.map((c) => (c as HastJsonElement).properties.name)).toEqual([
      'index.html',
      'index.js',
    ])
  })

  const fails = async (source: string, match: RegExp) => {
    const result = await compileMdx(source)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.map((e) => e.message).join('\n')).toMatch(match)
  }

  test('未知 template', () =>
    fails(playground('template="vue"', fence('js', '', '1')), /屬性 template/))

  test('缺少 template', () => fails(playground('', fence('js', '', '1')), /template/))

  test('無效 props', () =>
    fails(playground('template="html" height={10}', fence('html', '', '<p/>')), /屬性 height/))

  test('未知 prop', () =>
    fails(playground('template="html" onLoad="x"', fence('html', '', '<p/>')), /Playground/))

  test('不支援的語言', () =>
    fails(playground('template="html"', fence('python', '', 'print(1)')), /不支援語言/))

  test('子元素不是 code fence', () =>
    fails('<Playground template="html">\n\n一般段落\n\n</Playground>\n', /只能是 code fence/))

  test('沒有任何檔案', () =>
    fails('<Playground template="html">\n</Playground>\n', /至少需要一個/))

  test('檔名重複', () =>
    fails(
      playground('template="html"', fence('js', 'a.js', '1'), fence('js', 'a.js', '2')),
      /檔名重複/
    ))

  test('react 沒有 js 檔', () =>
    fails(playground('template="react"', fence('css', '', 'a{}')), /App\.jsx/))

  test('不能直接寫 PlaygroundFile', () =>
    fails('<PlaygroundFile name="a.js" lang="js">x</PlaygroundFile>\n', /由編譯器產生/))
})
