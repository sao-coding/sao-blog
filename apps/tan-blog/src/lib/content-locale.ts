import { getLocale, type Locale as UiLocale } from '#/paraglide/runtime'
import { LOCALES, type Locale as ContentLocale } from '@sao-blog/api/schema/i18n'

// UI 語系（Paraglide：zh-Hant / en / ja）與內容語系（DB：zh-TW / en / ja）的對照。
// DB 用 zh-TW 作為單一來源，tan-blog 的 Paraglide 維持 zh-Hant（URL 不帶前綴的預設語系）。

export type { ContentLocale }
export const CONTENT_LOCALES = LOCALES

export const toContentLocale = (locale: UiLocale): ContentLocale =>
  locale === 'zh-Hant' ? 'zh-TW' : locale

export const toUiLocale = (locale: ContentLocale): UiLocale =>
  locale === 'zh-TW' ? 'zh-Hant' : locale

/**
 * 目前頁面的內容語系。只在 loader / 元件 render 中呼叫：
 * createServerFn 的 handler 裡 URL 沒有語系前綴，getLocale() 會拿到預設語系，
 * 所以要在 loader 算好再當參數傳進 server fn。
 */
export const currentContentLocale = (): ContentLocale => toContentLocale(getLocale())
