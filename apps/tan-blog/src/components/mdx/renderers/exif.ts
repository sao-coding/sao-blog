// 燈箱裡顯示的拍攝資訊（相機、鏡頭、焦距、光圈、快門、ISO、日期）。
// exifr 只在點開照片時才動態載入，不進文章首屏的 bundle；它用 Range 請求只抓檔頭，所以大圖也不會整張下載。
// 截圖（PNG）通常沒有 EXIF，回傳 null，燈箱就什麼都不顯示。

const PICK = ['Make', 'Model', 'LensModel', 'FocalLength', 'FNumber', 'ExposureTime', 'ISO', 'DateTimeOriginal'] as const

type RawExif = Partial<{
  Make: string
  Model: string
  LensModel: string
  FocalLength: number
  FNumber: number
  ExposureTime: number
  ISO: number
  DateTimeOriginal: Date
}>

export type PhotoExif = {
  camera?: string
  lens?: string
  /** 焦距、光圈、快門、ISO，已格式化好的短字串 */
  settings: string[]
  date?: string
}

const cache = new Map<string, Promise<PhotoExif | null>>()

const trimNumber = (n: number, digits = 1) => String(Number(n.toFixed(digits)))

function format(raw: RawExif, locale?: string): PhotoExif | null {
  const make = raw.Make?.trim()
  const model = raw.Model?.trim()
  // 很多相機的 Model 已經含廠牌（Canon EOS R6），不要重複成「Canon Canon EOS R6」
  const camera = model ? (make && !model.toLowerCase().startsWith(make.toLowerCase()) ? `${make} ${model}` : model) : make

  const settings: string[] = []
  if (raw.FocalLength) settings.push(`${Math.round(raw.FocalLength)}mm`)
  if (raw.FNumber) settings.push(`ƒ/${trimNumber(raw.FNumber)}`)
  if (raw.ExposureTime) {
    const t = raw.ExposureTime
    settings.push(t < 1 ? `1/${Math.round(1 / t)}s` : `${trimNumber(t)}s`)
  }
  if (raw.ISO) settings.push(`ISO ${raw.ISO}`)

  const date =
    raw.DateTimeOriginal instanceof Date && !Number.isNaN(raw.DateTimeOriginal.getTime())
      ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(raw.DateTimeOriginal)
      : undefined

  if (!camera && !raw.LensModel && settings.length === 0) return null
  return { camera, lens: raw.LensModel?.trim(), settings, date }
}

export function readExif(src: string, locale?: string): Promise<PhotoExif | null> {
  const key = `${locale}|${src}`
  let task = cache.get(key)
  if (!task) {
    task = import('exifr')
      .then(({ default: exifr }) => exifr.parse(src, { pick: [...PICK] }) as Promise<RawExif | undefined>)
      .then((raw) => (raw ? format(raw, locale) : null))
      // 不支援的格式、網路錯誤、CORS 擋掉都當成沒有資訊
      .catch(() => null)
    cache.set(key, task)
  }
  return task
}
