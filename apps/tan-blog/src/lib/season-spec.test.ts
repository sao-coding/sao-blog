import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { getSolarTerm } from './season.ts'
import { inkDryness, mistDensity, mossTone, rakePattern, RAKE_PATTERNS } from './season-spec.ts'

// 一律用站主時區（+08:00）寫日期，避免測試機時區影響結果
const at = (iso: string) => new Date(`${iso}+08:00`)

describe('inkDryness', () => {
  const now = at('2026-10-26T12:00:00')

  it('同一個節氣寫的是濕墨', () => {
    assert.equal(inkDryness(at('2026-10-24T09:00:00'), now), 'wet')
  })

  it('上一個節氣但同一年是乾墨', () => {
    assert.equal(inkDryness(at('2026-10-01T09:00:00'), now), 'dry')
    assert.equal(inkDryness(at('2026-02-10T09:00:00'), now), 'dry')
  })

  it('更早的年份是淡墨', () => {
    assert.equal(inkDryness(at('2025-10-26T09:00:00'), now), 'faded')
  })

  it('排程到未來的當作剛寫的', () => {
    assert.equal(inkDryness(at('2026-12-01T09:00:00'), now), 'wet')
  })

  it('接受 ISO 字串', () => {
    assert.equal(inkDryness('2026-10-24T01:00:00.000Z', now), 'wet')
  })

  it('節氣邊界：立春前一天與當天不同節氣', () => {
    const before = at('2026-02-03T12:00:00')
    const after = at('2026-02-04T12:00:00')
    assert.notEqual(getSolarTerm(before).index, getSolarTerm(after).index)
    assert.equal(inkDryness(before, after), 'dry')
    assert.equal(inkDryness(after, after), 'wet')
  })

  it('冬至跨年：一月初仍在去年冬至的節氣裡', () => {
    const solstice = at('2025-12-25T12:00:00')
    const earlyJan = at('2026-01-02T12:00:00')
    assert.equal(getSolarTerm(earlyJan).term, '冬至')
    assert.equal(inkDryness(solstice, earlyJan), 'wet')
  })

  it('跨年但不同節氣：去年冬至的文章在小寒後是淡墨', () => {
    assert.equal(inkDryness(at('2025-12-25T12:00:00'), at('2026-01-10T12:00:00')), 'faded')
  })

  it('以站主時區判斷：UTC 還在前一天、台北已進下一個節氣', () => {
    // 2026-02-03T17:00Z = 2026-02-04 01:00 +08:00，台北已是立春
    const lateUtc = new Date('2026-02-03T17:00:00Z')
    assert.equal(getSolarTerm(lateUtc).term, '立春')
    assert.equal(inkDryness(lateUtc, at('2026-02-04T20:00:00')), 'wet')
  })
})

describe('rakePattern', () => {
  it('同一個節氣永遠同一種', () => {
    for (let i = 0; i < 24; i++) assert.equal(rakePattern(i), rakePattern(i))
  })

  it('輪替使用全部耙紋', () => {
    const used = new Set(Array.from({ length: 24 }, (_, i) => rakePattern(i)))
    assert.equal(used.size, RAKE_PATTERNS.length)
  })

  it('相鄰節氣不同紋', () => {
    for (let i = 0; i < 24; i++) assert.notEqual(rakePattern(i), rakePattern(i + 1))
  })

  it('負數與超出範圍也安全', () => {
    assert.equal(rakePattern(-1), rakePattern(23))
    assert.equal(rakePattern(24), rakePattern(0))
  })

  it('四季的代表節氣各不相同（頁尾預覽）', () => {
    const shown = new Set([5, 11, 17, 23].map(rakePattern))
    assert.equal(shown.size, 4)
  })
})

describe('mossTone / mistDensity', () => {
  it('四季各有苔色', () => {
    for (const s of ['spring', 'summer', 'autumn', 'winter'] as const) {
      const tone = mossTone(s)
      assert.ok(tone.l > 0 && tone.l < 1 && tone.c >= 0)
    }
  })

  it('白露、寒露、霜降霧最濃', () => {
    const termIndex = (name: string) => {
      for (let i = 0; i < 24; i++) {
        // 取各節氣中段的日期反查序號
        const probe = at(`2026-${String(Math.floor(i / 2) + 1).padStart(2, '0')}-${i % 2 ? '25' : '12'}T12:00:00`)
        if (getSolarTerm(probe).term === name) return { index: i, season: getSolarTerm(probe).season }
      }
      throw new Error(name)
    }
    const dew = termIndex('白露')
    const summer = termIndex('夏至')
    assert.ok(mistDensity(dew.index, dew.season) > mistDensity(summer.index, summer.season))
  })

  it('濃度在 0–1 之間', () => {
    for (let i = 0; i < 24; i++) {
      for (const s of ['spring', 'summer', 'autumn', 'winter'] as const) {
        const d = mistDensity(i, s)
        assert.ok(d >= 0 && d <= 1)
      }
    }
  })
})
