/**
 * 將 Date 或日期字串統一轉成 ISO 字串。
 * 供各 router 共用，避免重複定義 toIso / toIsoString。
 */
export const toIso = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();
