import { LOCALES, type Locale } from '@sao-blog/api/schema/i18n'

export { LOCALES, type Locale }

export const LOCALE_LABELS: Record<Locale, string> = {
  'zh-TW': '繁中',
  en: 'English',
  ja: '日本語',
}

/** 各語言版本在列表 / 分頁上的狀態 */
export interface TranslationState {
  locale: Locale
  status: string | boolean
  isSource: boolean
  translatedBy: 'human' | 'ai'
  outdated: boolean
}

export const isPublished = (status: string | boolean) =>
  status === true || status === 'published'

/**
 * oRPC 回應的 status: "error" 不會 throw，需自行判斷。
 * 回傳 null 表示成功；否則為要顯示給使用者的錯誤訊息（MDX 錯誤會包含行號）。
 */
export const apiErrorMessage = (res: { status: string; message?: string } | undefined) =>
  res && res.status === 'error' ? (res.message ?? '操作失敗') : null
