// 設計檢查：列出元素預算（紙、五階墨、朱、墨暈；DESIGN.md 第 0、1 節）以外的樣式。
//   node scripts/check-design.ts            列出違規並分類計數，不失敗（第三輪拆完之前的預設）
//   node scripts/check-design.ts --summary  只印分類計數與各檔案的數量
//   node scripts/check-design.ts --strict   有違規就以 exit 1 結束（階段 16 清完後改成預設）
// 某一行確定要留，在該行加 `design-ok：理由` 註解放行。

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../src', import.meta.url))

const GRAYS = 'zinc|neutral|slate|gray|stone'
const SHADES = '50|100|200|300|400|500|600|700|800|900|950'
const UTILITIES = 'bg|text|border|ring|from|via|to|fill|stroke|divide|outline|decoration|shadow|accent|caret'

// 「不是 class 名的一部分」：前面不是字母、數字、-、_
const B = '(?<![\\w-])'

const RULES: { name: string; pattern: RegExp; hint: string; css?: boolean }[] = [
  { name: 'shadow', pattern: new RegExp(`${B}(?:[\\w-]+:)*shadow-(?!none\\b)[\\w[\\]./()-]+`, 'g'), hint: '沒有陰影；分隔用 --ink-5 髮絲線' },
  { name: 'shadow', pattern: /(?<![\w-])(?:box|text)-shadow\s*:\s*(?!none)/g, hint: '沒有陰影；分隔用 --ink-5 髮絲線', css: true },
  { name: 'rounded', pattern: new RegExp(`${B}rounded(?:-[trbl]{1,2}|-[se]{1,2})?-(?:xl|2xl|3xl|4xl)(?![\\w-])`, 'g'), hint: '沒有卡片；圓角大到像卡片的拿掉' },
  { name: 'glass', pattern: /(?<![\w-])\.?glass(?:-strong)?(?![\w-])|(?<![\w-])backdrop-(?:blur|filter)[\w[\]./:-]*/g, hint: '毛玻璃停用' },
  {
    name: 'gradient',
    pattern: new RegExp(`${B}bg-(?:gradient-to-[a-z]+|linear-[\\w[\\]./-]+|radial[\\w[\\]./-]*|conic[\\w[\\]./-]*)|(?:repeating-)?(?:linear|radial|conic)-gradient\\(`, 'g'),
    hint: '沒有漸層；層次只靠濃淡',
  },
  {
    name: 'daisyui',
    pattern: new RegExp(`${B}(?:[\\w-]+:)*(?:${UTILITIES})-(?:base-(?:content|100|200|300)|(?:neutral|primary|secondary|accent|info|success|warning|error)-content)(?![\\w-])`, 'g'),
    hint: 'daisyUI 殘留 → --ink-*',
  },
  {
    name: 'tailwind-gray',
    pattern: new RegExp(`${B}(?:[\\w-]+:)*(?:${UTILITIES})-(?:${GRAYS})-(?:${SHADES})(?![\\w])`, 'g'),
    hint: 'Tailwind 原色 → --ink-*',
  },
  {
    name: 'hard-color',
    // token 定義（`--x: oklch(...)`）不算，另外處理
    pattern: /(?<![\w-])(?:oklch|oklab|rgba?|hsla?)\(|(?<=['"`\s:(,])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g,
    hint: '寫死的顏色 → --ink-* / --zhu / --background',
  },
]

// 不檢查的地方：shadcn 原始元件、第三方複製進來的元件
const IGNORE_DIRS = ['components/ui', 'components/kibo-ui', 'lib/og'] // lib/og：OG 圖由 takumi 繪製，不在頁面上
// 只檢查寫死顏色時放行：顏色本身就是資料，或要給沒有 CSS 變數的環境（OG 圖、iframe、canvas 預設值）
const COLOR_ALLOW = [
  'lib/term-themes.ts', // 二十四節氣的 --season 色票
  'components/icons/', // 技術品牌圖示的官方配色
  'components/mdx/renderers/playground-runtime.ts', // playground iframe 自己的樣式
]
const EXT = /\.(tsx?|css)$/
const TOKEN_DEF = /^\s*--[\w-]+\s*:/

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) yield* walk(full)
    else if (EXT.test(name) && !name.endsWith('.test.ts')) yield full
  }
}

const strict = process.argv.includes('--strict')
const summaryOnly = process.argv.includes('--summary')

type Hit = { file: string; line: number; match: string }
const hits = new Map<string, Hit[]>()
const hints = new Map<string, string>()

for (const file of walk(root)) {
  const rel = relative(root, file).split(sep).join('/')
  if (rel.startsWith('paraglide/') || rel === 'routeTree.gen.ts') continue
  if (IGNORE_DIRS.some((d) => rel.startsWith(`${d}/`))) continue
  const isCss = rel.endsWith('.css')
  const colorAllowed = COLOR_ALLOW.some((p) => rel === p || (p.endsWith('/') && rel.startsWith(p)))
  const lines = readFileSync(file, 'utf8').split(/\r?\n/)
  lines.forEach((line, i) => {
    if (line.includes('design-ok')) return
    if (/^\s*(?:\/\/|\*|\/\*)/.test(line)) return // 註解
    for (const rule of RULES) {
      if (rule.css && !isCss) continue
      if (rule.name === 'hard-color' && (colorAllowed || TOKEN_DEF.test(line))) continue
      for (const match of line.matchAll(rule.pattern)) {
        hints.set(rule.name, rule.hint)
        const list = hits.get(rule.name) ?? []
        list.push({ file: `src/${rel}`, line: i + 1, match: match[0] })
        hits.set(rule.name, list)
      }
    }
  })
}

let total = 0
for (const list of hits.values()) total += list.length

if (total === 0) {
  console.log('check:design ✓ 沒有超出元素預算的樣式')
  process.exit(0)
}

for (const [name, list] of hits) {
  console.log(`\n── ${name}（${list.length}）— ${hints.get(name)}`)
  if (summaryOnly) {
    const perFile = new Map<string, number>()
    for (const h of list) perFile.set(h.file, (perFile.get(h.file) ?? 0) + 1)
    for (const [f, n] of [...perFile].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${f}`)
  } else {
    for (const h of list) console.log(`  ${h.file}:${h.line}  ${h.match}`)
  }
}

console.log(`\ncheck:design 元素預算以外 ${total} 處${strict ? '' : '（只列出，不失敗）'}`)
for (const [name, list] of hits) console.log(`  ${name.padEnd(14)}${list.length}`)
process.exit(strict ? 1 : 0)
