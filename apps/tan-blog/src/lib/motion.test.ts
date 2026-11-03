import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { MOTION_CSS_VARS } from './motion.ts'

const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8')

describe('動態 token', () => {
  for (const [name, value] of Object.entries(MOTION_CSS_VARS)) {
    it(`styles.css 的 ${name} 與 motion.ts 一致`, () => {
      const m = css.match(new RegExp(`${name}:\\s*([^;]+);`))
      assert.ok(m, `styles.css 沒有定義 ${name}`)
      assert.equal(m[1].trim(), value)
    })
  }
})
