import { SEASON_REPRESENTATIVE_TERM, type Season } from './season'

// 二十四節氣的主題：每個節氣一個點綴色（--season）與一組飄落元素的比例。
// 節氣的物候選了幾樣有臺灣味的：立夏油桐花、芒種鳳凰花、秋分臺灣欒樹。

export type ParticleKind =
  | 'plum' // 梅
  | 'peach' // 桃瓣
  | 'sakura' // 櫻瓣
  | 'tung' // 油桐花
  | 'phoenix' // 鳳凰花瓣
  | 'firefly' // 螢火
  | 'lotus' // 荷瓣
  | 'osmanthus' // 桂花
  | 'luan' // 臺灣欒樹蒴果
  | 'maple-yellow' // 轉黃的楓
  | 'maple-red' // 紅楓
  | 'ginkgo' // 銀杏
  | 'snow' // 雪
  | 'rain' // 雨
  | 'sunmote' // 晴天的光塵

export type ParticleMix = [ParticleKind, number][]

export interface TermTheme {
  accent: string
  mix: ParticleMix
}

export const TERM_THEMES: TermTheme[] = [
  /* 0 小寒 */ { accent: 'oklch(0.82 0.07 350)', mix: [['plum', 1], ['snow', 1]] },
  /* 1 大寒 */ { accent: 'oklch(0.82 0.07 350)', mix: [['plum', 1.2], ['snow', 0.8]] },
  /* 2 立春 */ { accent: 'oklch(0.8 0.09 355)', mix: [['plum', 1], ['peach', 0.6]] },
  /* 3 雨水 */ { accent: 'oklch(0.8 0.1 10)', mix: [['peach', 1], ['rain', 0.6]] },
  /* 4 驚蟄 */ { accent: 'oklch(0.8 0.1 10)', mix: [['peach', 1.2]] },
  /* 5 春分 */ { accent: 'oklch(0.86 0.06 350)', mix: [['sakura', 1.5]] },
  /* 6 清明 */ { accent: 'oklch(0.86 0.06 350)', mix: [['sakura', 1], ['rain', 0.5]] },
  /* 7 穀雨 */ { accent: 'oklch(0.82 0.08 0)', mix: [['sakura', 0.6], ['peach', 0.6], ['rain', 0.4]] },
  /* 8 立夏 */ { accent: 'oklch(0.92 0.03 95)', mix: [['tung', 1.5]] },
  /* 9 小滿 */ { accent: 'oklch(0.92 0.03 95)', mix: [['tung', 1.2], ['firefly', 0.3]] },
  /* 10 芒種 */ { accent: 'oklch(0.72 0.16 38)', mix: [['phoenix', 1], ['firefly', 0.6]] },
  /* 11 夏至 */ { accent: 'oklch(0.88 0.14 120)', mix: [['firefly', 1], ['phoenix', 0.5]] },
  /* 12 小暑 */ { accent: 'oklch(0.8 0.1 0)', mix: [['lotus', 1], ['firefly', 0.8]] },
  /* 13 大暑 */ { accent: 'oklch(0.8 0.1 0)', mix: [['lotus', 1.2], ['firefly', 0.6]] },
  /* 14 立秋 */ { accent: 'oklch(0.82 0.13 78)', mix: [['osmanthus', 1], ['firefly', 0.3]] },
  /* 15 處暑 */ { accent: 'oklch(0.82 0.13 78)', mix: [['osmanthus', 1.2]] },
  /* 16 白露 */ { accent: 'oklch(0.82 0.12 88)', mix: [['osmanthus', 0.8], ['luan', 0.8]] },
  /* 17 秋分 */ { accent: 'oklch(0.76 0.11 18)', mix: [['luan', 1.2], ['maple-yellow', 0.6]] },
  /* 18 寒露 */ { accent: 'oklch(0.72 0.14 45)', mix: [['maple-yellow', 0.6], ['maple-red', 0.8], ['ginkgo', 0.5]] },
  /* 19 霜降 */ { accent: 'oklch(0.66 0.16 30)', mix: [['maple-red', 1.2], ['ginkgo', 0.5]] },
  /* 20 立冬 */ { accent: 'oklch(0.82 0.13 88)', mix: [['ginkgo', 1.2], ['maple-red', 0.4]] },
  /* 21 小雪 */ { accent: 'oklch(0.9 0.03 240)', mix: [['snow', 1], ['ginkgo', 0.4]] },
  /* 22 大雪 */ { accent: 'oklch(0.9 0.03 240)', mix: [['snow', 1.5]] },
  /* 23 冬至 */ { accent: 'oklch(0.9 0.03 240)', mix: [['snow', 1.2], ['plum', 0.3]] },
]

export const SEASON_ACCENTS: Record<Season, string> = {
  spring: TERM_THEMES[SEASON_REPRESENTATIVE_TERM.spring].accent,
  summer: TERM_THEMES[SEASON_REPRESENTATIVE_TERM.summer].accent,
  autumn: TERM_THEMES[SEASON_REPRESENTATIVE_TERM.autumn].accent,
  winter: TERM_THEMES[SEASON_REPRESENTATIVE_TERM.winter].accent,
}

// 日記的「天氣」是自由文字（晴天、小雨…），抓關鍵字對應成飄落物與光暈色；對不上就回 null，改用節氣
export function weatherTheme(weather: string | null | undefined): TermTheme | null {
  if (!weather) return null
  if (/雪/.test(weather)) return { accent: 'oklch(0.92 0.02 240)', mix: [['snow', 1.5]] }
  if (/雨/.test(weather)) return { accent: 'oklch(0.72 0.04 240)', mix: [['rain', 2]] }
  if (/晴|陽|日/.test(weather)) return { accent: 'oklch(0.86 0.12 85)', mix: [['sunmote', 1.4]] }
  return null
}
