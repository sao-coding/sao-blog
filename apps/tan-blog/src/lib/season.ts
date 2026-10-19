// 以二十四節氣劃分四季（立春／立夏／立秋／立冬為各季起點），一律用站主所在時區計算，
// 讓伺服器與瀏覽器得到同一個結果。
//
// 節氣日期用「壽星公式」近似：day = floor(Y·D + C) − floor(L)，
// Y 為年份後兩位、D = 0.2422、C 為 21 世紀各節氣常數、L 為閏年修正（小寒～雨水用 (Y−1)/4）。
// 準確度約 ±1 天（少數年份有例外），對「換季點綴色」來說足夠。

export const SITE_TZ = 'Asia/Taipei'

export type Season = 'spring' | 'summer' | 'autumn' | 'winter'
export const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter']

// 依公曆月份排列：每個月兩個節氣（月初「節」、月中「氣」）
const TERMS: { name: string; c: number }[] = [
  { name: '小寒', c: 5.4055 }, { name: '大寒', c: 20.12 }, // 1 月
  { name: '立春', c: 3.87 }, { name: '雨水', c: 18.73 }, // 2 月
  { name: '驚蟄', c: 5.63 }, { name: '春分', c: 20.646 }, // 3 月
  { name: '清明', c: 4.81 }, { name: '穀雨', c: 20.1 }, // 4 月
  { name: '立夏', c: 5.52 }, { name: '小滿', c: 21.04 }, // 5 月
  { name: '芒種', c: 5.678 }, { name: '夏至', c: 21.37 }, // 6 月
  { name: '小暑', c: 7.108 }, { name: '大暑', c: 22.83 }, // 7 月
  { name: '立秋', c: 7.5 }, { name: '處暑', c: 23.13 }, // 8 月
  { name: '白露', c: 7.646 }, { name: '秋分', c: 23.042 }, // 9 月
  { name: '寒露', c: 8.318 }, { name: '霜降', c: 23.438 }, // 10 月
  { name: '立冬', c: 7.438 }, { name: '小雪', c: 22.36 }, // 11 月
  { name: '大雪', c: 7.18 }, { name: '冬至', c: 21.94 }, // 12 月
]

function termDay(year: number, index: number) {
  const y = year % 100
  const leap = index < 4 ? Math.floor((y - 1) / 4) : Math.floor(y / 4)
  return Math.floor(y * 0.2422 + TERMS[index].c) - leap
}

// 站主時區的「今天」年月日
function localYmd(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SITE_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  return { year: get('year'), month: get('month'), day: get('day') }
}

export interface SolarTermInfo {
  // 目前所在的節氣（最近一個已經過的節氣）
  term: string
  season: Season
}

export function getSolarTerm(date = new Date()): SolarTermInfo {
  const { year, month, day } = localYmd(date)
  // 從本月第二個節氣往回找，第一個 <= 今天的就是目前節氣
  let index = month * 2 - 1
  let termYear = year
  for (;;) {
    const termMonth = Math.floor(index / 2) + 1
    if (termYear < year || termMonth < month || termDay(termYear, index) <= day) break
    index--
    if (index < 0) {
      index = TERMS.length - 1
      termYear--
    }
  }
  // 立春(2)~穀雨(7) 春、立夏(8)~大暑(13) 夏、立秋(14)~霜降(19) 秋、其餘冬
  const season: Season = index >= 2 && index < 8 ? 'spring' : index < 14 && index >= 8 ? 'summer' : index < 20 && index >= 14 ? 'autumn' : 'winter'
  return { term: TERMS[index].name, season }
}

export const SEASON_STORAGE_KEY = 'season-override'

// 在 <head> 以 ScriptOnce 執行：先套用訪客手動選的季節（若有），避免換色閃爍。
// 伺服器已依真實節氣在 <html data-season> 寫好預設值，這裡只處理覆寫。
export const SEASON_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem('${SEASON_STORAGE_KEY}');if(s==='spring'||s==='summer'||s==='autumn'||s==='winter'){document.documentElement.dataset.season=s;}}catch(e){}})();`
