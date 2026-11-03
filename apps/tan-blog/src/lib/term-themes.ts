import { SEASON_REPRESENTATIVE_TERM, type Season } from './season'

// 二十四節氣的點綴色（--season）：只給墨暈引擎的 accent 用（DESIGN.md 第 1 節）。

export interface TermTheme {
  accent: string
}

export const TERM_THEMES: TermTheme[] = [
  /* 0 小寒 */ { accent: 'oklch(0.82 0.07 350)' },
  /* 1 大寒 */ { accent: 'oklch(0.82 0.07 350)' },
  /* 2 立春 */ { accent: 'oklch(0.8 0.09 355)' },
  /* 3 雨水 */ { accent: 'oklch(0.8 0.1 10)' },
  /* 4 驚蟄 */ { accent: 'oklch(0.8 0.1 10)' },
  /* 5 春分 */ { accent: 'oklch(0.86 0.06 350)' },
  /* 6 清明 */ { accent: 'oklch(0.86 0.06 350)' },
  /* 7 穀雨 */ { accent: 'oklch(0.82 0.08 0)' },
  /* 8 立夏 */ { accent: 'oklch(0.92 0.03 95)' },
  /* 9 小滿 */ { accent: 'oklch(0.92 0.03 95)' },
  /* 10 芒種 */ { accent: 'oklch(0.72 0.16 38)' },
  /* 11 夏至 */ { accent: 'oklch(0.88 0.14 120)' },
  /* 12 小暑 */ { accent: 'oklch(0.8 0.1 0)' },
  /* 13 大暑 */ { accent: 'oklch(0.8 0.1 0)' },
  /* 14 立秋 */ { accent: 'oklch(0.82 0.13 78)' },
  /* 15 處暑 */ { accent: 'oklch(0.82 0.13 78)' },
  /* 16 白露 */ { accent: 'oklch(0.82 0.12 88)' },
  /* 17 秋分 */ { accent: 'oklch(0.76 0.11 18)' },
  /* 18 寒露 */ { accent: 'oklch(0.72 0.14 45)' },
  /* 19 霜降 */ { accent: 'oklch(0.66 0.16 30)' },
  /* 20 立冬 */ { accent: 'oklch(0.82 0.13 88)' },
  /* 21 小雪 */ { accent: 'oklch(0.9 0.03 240)' },
  /* 22 大雪 */ { accent: 'oklch(0.9 0.03 240)' },
  /* 23 冬至 */ { accent: 'oklch(0.9 0.03 240)' },
]

export const SEASON_ACCENTS: Record<Season, string> = {
  spring: TERM_THEMES[SEASON_REPRESENTATIVE_TERM.spring].accent,
  summer: TERM_THEMES[SEASON_REPRESENTATIVE_TERM.summer].accent,
  autumn: TERM_THEMES[SEASON_REPRESENTATIVE_TERM.autumn].accent,
  winter: TERM_THEMES[SEASON_REPRESENTATIVE_TERM.winter].accent,
}

