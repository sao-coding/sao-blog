// 「景隨節氣」的規格檔：只有數字與純函式。
// 首頁、庭、OG 圖都從這裡取值，畫出來才一致（見 DESIGN.md 第 5 節「規格檔」）。
// 不碰 React、不碰 canvas、不用 Math.random()——需要變化時用節氣序號當種子。

import { getSolarTerm, localYmd, type Season } from './season.ts'

// 標題的墨：這個節氣寫的 → 濕、今年寫的 → 乾、更早 → 淡
export type InkDryness = 'wet' | 'dry' | 'faded'

// 節氣所屬的年份：一月初還在前一年冬至裡（index 比「該月第二個節氣」還大就是跨年了）
function termYear(year: number, month: number, index: number) {
  return index > month * 2 - 1 ? year - 1 : year
}

function termKey(date: Date) {
  const { year, month } = localYmd(date)
  const { index } = getSolarTerm(date)
  return { year, termYear: termYear(year, month, index), index }
}

export function inkDryness(publishedAt: Date | string, now = new Date()): InkDryness {
  const published = new Date(publishedAt)
  // 比現在還晚的（排程發佈、時鐘誤差）當作剛寫的
  if (published.getTime() >= now.getTime()) return 'wet'
  const p = termKey(published)
  const n = termKey(now)
  if (p.index === n.index && p.termYear === n.termYear) return 'wet'
  return p.year === n.year ? 'dry' : 'faded'
}

// 耙紋：二十四個節氣輪替這幾種，同一個節氣每次打開都一樣
export const RAKE_PATTERNS = [
  'straight', // 直紋
  'wave', // 波紋
  'seigaiha', // 青海波
  'vortex', // 渦紋
  'ripple', // 同心圓（繞石的水紋）
  'diagonal', // 斜紋
] as const
export type RakePattern = (typeof RAKE_PATTERNS)[number]

// 每輪完六種就錯開一格：四季的代表節氣（5／11／17／23）才不會都落在同一種
export function rakePattern(termIndex: number): RakePattern {
  const n = RAKE_PATTERNS.length
  const i = ((Math.trunc(termIndex) % 24) + 24) % 24
  return RAKE_PATTERNS[(i + Math.floor(i / n)) % n]
}

// 苔色（OKLCH）：春青綠、夏濃綠、秋偏黃褐、冬灰綠
export interface MossTone {
  l: number
  c: number
  h: number
}

const MOSS: Record<Season, MossTone> = {
  spring: { l: 0.68, c: 0.11, h: 140 },
  summer: { l: 0.5, c: 0.12, h: 150 },
  autumn: { l: 0.56, c: 0.08, h: 110 },
  winter: { l: 0.58, c: 0.03, h: 160 },
}

export function mossTone(season: Season): MossTone {
  return MOSS[season]
}

// 霧的濃度 0–1：白露／秋分／寒露／霜降霧較濃，其餘依季節
const SEASON_MIST: Record<Season, number> = {
  spring: 0.35,
  summer: 0.2,
  autumn: 0.45,
  winter: 0.3,
}
// 節氣序號（公曆順序）：16 白露、17 秋分、18 寒露、19 霜降
const MISTY_TERMS: Record<number, number> = { 16: 0.8, 17: 0.55, 18: 0.8, 19: 0.8 }

export function mistDensity(termIndex: number, season: Season): number {
  return MISTY_TERMS[termIndex] ?? SEASON_MIST[season]
}
