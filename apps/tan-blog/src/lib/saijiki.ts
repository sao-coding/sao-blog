// 歲時記：節氣與七十二候的換算（首頁障子曆用）。純函式，只有數字，跟 season-spec 一樣不碰 React。
// 節氣日期沿用 season.ts 的壽星公式；一候 = 該節氣的三分之一（約五天）。

import { localYmd, termDay, TERM_NAMES, type Season } from './season.ts'

const DAY = 86_400_000
const SITE_OFFSET = 8 * 3_600_000

// 七十二候（日本略本暦的候名），依 TERM_NAMES 的順序：小寒 … 冬至，各三候
export const KO_NAMES: readonly (readonly [string, string, string])[] = [
  ['芹乃栄', '水泉動', '雉始雊'], // 小寒
  ['款冬華', '水沢腹堅', '鶏始乳'], // 大寒
  ['東風解凍', '黄鶯睍睆', '魚上氷'], // 立春
  ['土脉潤起', '霞始靆', '草木萌動'], // 雨水
  ['蟄虫啓戸', '桃始笑', '菜虫化蝶'], // 驚蟄
  ['雀始巣', '桜始開', '雷乃発声'], // 春分
  ['玄鳥至', '鴻雁北', '虹始見'], // 清明
  ['葭始生', '霜止出苗', '牡丹華'], // 穀雨
  ['蛙始鳴', '蚯蚓出', '竹笋生'], // 立夏
  ['蚕起食桑', '紅花栄', '麦秋至'], // 小滿
  ['蟷螂生', '腐草為螢', '梅子黄'], // 芒種
  ['乃東枯', '菖蒲華', '半夏生'], // 夏至
  ['温風至', '蓮始開', '鷹乃学習'], // 小暑
  ['桐始結花', '土潤溽暑', '大雨時行'], // 大暑
  ['涼風至', '寒蝉鳴', '蒙霧升降'], // 立秋
  ['綿柎開', '天地始粛', '禾乃登'], // 處暑
  ['草露白', '鶺鴒鳴', '玄鳥去'], // 白露
  ['雷乃収声', '蟄虫坏戸', '水始涸'], // 秋分
  ['鴻雁来', '菊花開', '蟋蟀在戸'], // 寒露
  ['霜始降', '霎時施', '楓蔦黄'], // 霜降
  ['山茶始開', '地始凍', '金盞香'], // 立冬
  ['虹蔵不見', '朔風払葉', '橘始黄'], // 小雪
  ['閉塞成冬', '熊蟄穴', '鱖魚群'], // 大雪
  ['乃東生', '麋角解', '雪下出麦'], // 冬至
]

// 各季的六個節氣，依時間先後；冬天跨年（立冬～冬至，接著隔年的小寒、大寒）
export const SEASON_TERMS: Record<Season, readonly number[]> = {
  spring: [2, 3, 4, 5, 6, 7],
  summer: [8, 9, 10, 11, 12, 13],
  autumn: [14, 15, 16, 17, 18, 19],
  winter: [20, 21, 22, 23, 0, 1],
}

export function seasonOfTerm(index: number): Season {
  if (index >= 2 && index < 8) return 'spring'
  if (index >= 8 && index < 14) return 'summer'
  if (index >= 14 && index < 20) return 'autumn'
  return 'winter'
}

// 季的年份：小寒、大寒算前一年的冬
export const seasonYear = (index: number, year: number) => (index < 2 ? year - 1 : year)

// 某年某節氣開始的那一刻（站主時區的 00:00）
export function termStart(year: number, index: number) {
  return Date.UTC(year, Math.floor(index / 2), termDay(year, index)) - SITE_OFFSET
}

const nextTerm = (year: number, index: number) => (index === 23 ? { year: year + 1, index: 0 } : { year, index: index + 1 })

export interface TermSlot {
  index: number
  // 節氣開始那一天的公曆年
  year: number
  name: string
  start: number
  end: number
}

const slot = (year: number, index: number): TermSlot => {
  const next = nextTerm(year, index)
  return { index, year, name: TERM_NAMES[index], start: termStart(year, index), end: termStart(next.year, next.index) }
}

export const termKey = (s: { year: number; index: number }) => `${s.year}-${s.index}`

export interface TermAt extends TermSlot {
  // 第幾候：0 初候、1 次候、2 末候
  ko: 0 | 1 | 2
  next: TermSlot
}

export function termAt(date: Date | string = new Date()): TermAt {
  const d = typeof date === 'string' ? new Date(date) : date
  const t = d.getTime()
  let year = localYmd(d).year
  let index = 23
  while (termStart(year, index) > t) {
    index--
    if (index < 0) {
      index = 23
      year--
    }
  }
  const s = slot(year, index)
  const next = nextTerm(year, index)
  const ko = Math.min(2, Math.max(0, Math.floor(((t - s.start) * 3) / (s.end - s.start)))) as 0 | 1 | 2
  return { ...s, ko, next: slot(next.year, next.index) }
}

// 某一季（seasonYr 年的那一季）的六個節氣
export function seasonSlots(season: Season, seasonYr: number): TermSlot[] {
  return SEASON_TERMS[season].map((index) => slot(season === 'winter' && index < 2 ? seasonYr + 1 : seasonYr, index))
}

// 某一季最近的一次（含現在這一季）：今年的那一季還沒到，就是去年的
export function latestSeasonYear(season: Season, now: Date = new Date()) {
  const cur = termAt(now)
  const curYear = seasonYear(cur.index, cur.year)
  if (season === seasonOfTerm(cur.index)) return curYear
  return termStart(curYear, SEASON_TERMS[season][0]) <= now.getTime() ? curYear : curYear - 1
}

// 到下一個節氣還有幾天（以站主時區的日曆天算）
export function daysUntil(end: number, now: Date = new Date()) {
  const { year, month, day } = localYmd(now)
  const today = Date.UTC(year, month - 1, day) - SITE_OFFSET
  return Math.max(0, Math.round((end - today) / DAY))
}

// 依節氣分桶，key 是 termKey
export function bucketByTerm<T extends { createdAt: string }>(items: readonly T[]) {
  const map = new Map<string, (T & { ko: 0 | 1 | 2 })[]>()
  for (const item of items) {
    const at = termAt(item.createdAt)
    const key = termKey(at)
    const list = map.get(key) ?? []
    list.push({ ...item, ko: at.ko })
    map.set(key, list)
  }
  return map
}
