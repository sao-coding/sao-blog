// 設計檢查：擋掉違反「紙與墨」的樣式（見 DESIGN.md 規則二）。
//   node scripts/check-design.ts          有違規就以 exit 1 結束
//   node scripts/check-design.ts --warn   只列出，不失敗

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../src', import.meta.url))

const GRAYS = 'zinc|neutral|slate|gray|stone'
const SHADES = '50|100|200|300|400|500|600|700|800|900|950'
const UTILITIES = 'bg|text|border|ring|from|via|to|fill|stroke|divide|outline|decoration|shadow|accent|caret'

const RULES: { name: string; pattern: RegExp; hint: string }[] = [
  { name: 'backdrop-blur', pattern: /(?<![\w-])backdrop-blur(?:-[\w[\]./]+)?/g, hint: '毛玻璃統一用 .glass / .glass-strong（styles.css）' },
  { name: 'gradient', pattern: /(?<![\w-])bg-(?:gradient-to-[a-z]+|linear-[\w[\]./-]+|radial[\w[\]./-]*|conic[\w[\]./-]*)/g, hint: 'CSS 漸層 → 暈染或筆觸' },
  { name: 'heavy-shadow', pattern: /(?<![\w-])shadow-(?:lg|xl|2xl)(?![\w-])/g, hint: '粗陰影 → 髮絲線；陰影只給真的浮起來的東西' },
  {
    name: 'tailwind-gray',
    pattern: new RegExp(`(?<![\\w-])(?:${UTILITIES})-(?:${GRAYS})-(?:${SHADES})(?![\\w])`, 'g'),
    hint: 'Tailwind 原色 → --foreground / --background 混色',
  },
]

// 不檢查的地方：shadcn 原始元件、第三方複製進來的元件
const IGNORE_DIRS = ['components/ui', 'components/kibo-ui']
const EXT = /\.(tsx?|css)$/

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) yield* walk(full)
    else if (EXT.test(name)) yield full
  }
}

const warnOnly = process.argv.includes('--warn')
let count = 0

for (const file of walk(root)) {
  const rel = relative(root, file).split(sep).join('/')
  if (IGNORE_DIRS.some((d) => rel.startsWith(`${d}/`))) continue
  const lines = readFileSync(file, 'utf8').split(/\r?\n/)
  lines.forEach((line, i) => {
    // 該行有 design-ok 註解就放行（附上理由）
    if (line.includes('design-ok')) return
    for (const rule of RULES) {
      for (const match of line.matchAll(rule.pattern)) {
        count++
        console.log(`${warnOnly ? 'warn' : 'error'}  src/${rel}:${i + 1}  [${rule.name}] ${match[0]}  — ${rule.hint}`)
      }
    }
  })
}

if (count === 0) console.log('check:design ✓ 沒有違規')
else console.log(`\ncheck:design ${count} 處違規${warnOnly ? '（--warn，不失敗）' : ''}`)
process.exit(count > 0 && !warnOnly ? 1 : 0)
