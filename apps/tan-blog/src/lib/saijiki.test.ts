import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { bucketByTerm, daysUntil, KO_NAMES, latestSeasonYear, seasonSlots, termAt } from './saijiki.ts'

// 一律用站主時區（+08:00）寫日期，避免測試機時區影響結果
const at = (iso: string) => new Date(`${iso}+08:00`)

describe('termAt', () => {
  it('霜降第五天是初候', () => {
    const t = termAt(at('2026-10-27T12:00:00'))
    assert.equal(t.name, '霜降')
    assert.equal(t.year, 2026)
    assert.equal(t.ko, 0)
    assert.equal(t.next.name, '立冬')
  })

  it('節氣當天 00:00 就換過去', () => {
    assert.equal(termAt(at('2026-10-23T00:00:00')).name, '霜降')
    assert.equal(termAt(at('2026-10-22T23:59:00')).name, '寒露')
  })

  it('節氣最後幾天是末候', () => {
    assert.equal(termAt(at('2026-11-06T12:00:00')).ko, 2)
  })

  it('一月初還在去年的冬至', () => {
    const t = termAt(at('2027-01-02T12:00:00'))
    assert.equal(t.name, '冬至')
    assert.equal(t.year, 2026)
    assert.equal(t.next.name, '小寒')
    assert.equal(t.next.year, 2027)
  })
})

describe('季與節氣', () => {
  it('冬天的小寒、大寒在隔年', () => {
    const slots = seasonSlots('winter', 2025)
    assert.deepEqual(
      slots.map((s) => `${s.year}${s.name}`),
      ['2025立冬', '2025小雪', '2025大雪', '2025冬至', '2026小寒', '2026大寒']
    )
  })

  it('還沒到的季取去年的', () => {
    const now = at('2026-10-27T12:00:00')
    assert.equal(latestSeasonYear('autumn', now), 2026)
    assert.equal(latestSeasonYear('spring', now), 2026)
    assert.equal(latestSeasonYear('winter', now), 2025)
  })

  it('一月時現在這一季是去年的冬', () => {
    assert.equal(latestSeasonYear('winter', at('2027-01-10T12:00:00')), 2026)
  })
})

describe('其他', () => {
  it('七十二候', () => {
    assert.equal(KO_NAMES.length, 24)
    assert.equal(KO_NAMES[19][2], '楓蔦黄')
  })

  it('離立冬還有幾天', () => {
    const t = termAt(at('2026-10-27T21:00:00'))
    assert.equal(daysUntil(t.end, at('2026-10-27T21:00:00')), 11)
  })

  it('依節氣分桶，帶上第幾候', () => {
    const map = bucketByTerm([
      { createdAt: '2026-10-23T02:00:00.000Z' },
      { createdAt: '2026-11-01T02:00:00.000Z' },
      { createdAt: '2026-10-10T02:00:00.000Z' },
    ])
    assert.deepEqual(map.get('2026-19')?.map((i) => i.ko), [0, 1])
    assert.equal(map.get('2026-18')?.length, 1)
  })
})
