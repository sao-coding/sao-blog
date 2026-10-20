import { deLocalizeHref, getLocale, localizeHref } from '#/paraglide/runtime'
import { m } from '#/paraglide/messages'
import { LOCALE_LABELS } from '@/components/locale-switcher'
import { toUiLocale, type ContentLocale } from '@/lib/content-locale'

type ContentLocaleNoticeProps = {
  /** 頁面路徑（不含語系前綴），例如 /posts/my-slug */
  path: string
  isFallback?: boolean
  translatedBy?: 'human' | 'ai'
  availableLocales?: ContentLocale[]
}

/**
 * 文章 / 日記頁頂的語言提示：
 * - 目前語系沒有譯文、顯示原文時 → 提示「本文尚無此語言版本」
 * - 這個語言版本是 AI 翻譯 → 小字標註
 * - 其他已發布的語言版本 → 連結（換語系會整頁重新載入，與 footer 的語系切換一致）
 */
export function ContentLocaleNotice({
  path,
  isFallback,
  translatedBy,
  availableLocales = [],
}: ContentLocaleNoticeProps) {
  const current = getLocale()
  const others = availableLocales.map(toUiLocale).filter((locale) => locale !== current)
  const showAi = translatedBy === 'ai' && !isFallback

  if (!isFallback && !showAi && others.length === 0) return null

  const base = deLocalizeHref(path)

  return (
    <div className="mb-6 space-y-1 rounded-md border border-dashed border-border px-4 py-3 font-wenkai text-sm text-muted-foreground">
      {isFallback && <p>{m.content_fallback_notice()}</p>}
      {showAi && <p>{m.content_ai_translated()}</p>}
      {others.length > 0 && (
        <p>
          {m.content_available_in()}{' '}
          {others.map((locale, i) => (
            <span key={locale}>
              {i > 0 && ' · '}
              <a
                href={localizeHref(base, { locale })}
                hrefLang={locale}
                className="text-foreground underline underline-offset-4 hover:text-primary"
              >
                {LOCALE_LABELS[locale]}
              </a>
            </span>
          ))}
        </p>
      )}
    </div>
  )
}
