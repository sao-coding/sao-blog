import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { dayjsLocale } from '@/lib/date-locale'
import { SITE_TZ } from '@/lib/season'

dayjs.extend(utc)
dayjs.extend(timezone)

// 依站主所在時區（Asia/Taipei）解讀時間：伺服器與瀏覽器時區可能不同，
// 用執行環境時區會讓 SSR 與 hydration 把同一篇分到不同的「那一天」。
export const siteTime = (d: Date | string) => dayjs(d).tz(SITE_TZ).locale(dayjsLocale())
