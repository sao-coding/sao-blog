import { getSolarTerm } from '@/lib/season'
import { siteTime } from '@/lib/site-time'

// 干支紀年，用於信箋落款（例：丙午年 寒露）。
// 傳統以立春換年：小寒、大寒（立春之前）仍算前一年。
const STEMS = '甲乙丙丁戊己庚辛壬癸'
const BRANCHES = '子丑寅卯辰巳午未申酉戌亥'

export function ganzhiYear(date: Date | string) {
  const d = siteTime(date)
  const { index } = getSolarTerm(new Date(date))
  const year = index < 2 && d.month() < 2 ? d.year() - 1 : d.year()
  const offset = year - 4 // 西元 4 年為甲子年
  return `${STEMS[((offset % 10) + 10) % 10]}${BRANCHES[((offset % 12) + 12) % 12]}`
}
