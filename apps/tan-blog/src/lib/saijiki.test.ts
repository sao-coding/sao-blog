import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { daysUntil, KO_NAMES, springYear, termAt } from './saijiki.ts'

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

describe('其他', () => {
  it('七十二候', () => {
    assert.equal(KO_NAMES.length, 24)
    assert.equal(KO_NAMES[19][2], '楓蔦黄')
  })

  it('離立冬還有幾天', () => {
    const t = termAt(at('2026-10-27T21:00:00'))
    assert.equal(daysUntil(t.end, at('2026-10-27T21:00:00')), 11)
  })
})

describe('springYear', () => {
  it('從立春排到大寒', () => {
    const y = springYear(at('2026-11-03T12:00:00'))
    assert.equal(y.length, 24)
    assert.equal(y[0].name, '立春')
    assert.equal(y[0].year, 2026)
    assert.equal(y[23].name, '大寒')
    assert.equal(y[23].year, 2027)
    assert.ok(y.every((s, i) => i === 0 || s.start === y[i - 1].end))
  })

  it('立春之前還算前一年', () => {
    const y = springYear(at('2027-01-20T12:00:00'))
    assert.equal(y[0].year, 2026)
    assert.equal(springYear(at('2027-02-04T12:00:00'))[0].year, 2027)
  })
})
