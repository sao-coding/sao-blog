import { Badge } from '@sao-blog/ui/components/badge'
import { cn } from '@sao-blog/ui/lib/utils'
import { isPublished, LOCALE_LABELS, LOCALES, type TranslationState } from './locales'

/**
 * 列表用的語言狀態 badge：每個語系一個小標籤
 * - 綠：已發布　灰：草稿　琥珀：原文改過、譯文過期　虛線：尚無此語言
 */
export function TranslationBadges({ translations = [] }: { translations?: TranslationState[] }) {
  const byLocale = new Map(translations.map((t) => [t.locale, t]))

  return (
    <div className="flex flex-wrap gap-1">
      {LOCALES.map((locale) => {
        const t = byLocale.get(locale)
        const title = !t
          ? '尚無此語言版本'
          : [
              t.isSource ? '原文' : '譯文',
              isPublished(t.status) ? '已發布' : '草稿',
              t.translatedBy === 'ai' ? 'AI 翻譯' : null,
              t.outdated ? '原文已更新，譯文過期' : null,
            ]
              .filter(Boolean)
              .join('・')

        return (
          <Badge
            key={locale}
            variant="outline"
            title={title}
            className={cn(
              'px-1.5 text-[10px] font-normal',
              !t && 'border-dashed text-muted-foreground/60',
              t && isPublished(t.status) && !t.outdated && 'border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300',
              t && !isPublished(t.status) && !t.outdated && 'bg-muted text-muted-foreground',
              t?.outdated && 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300',
              t?.isSource && 'font-semibold'
            )}
          >
            {LOCALE_LABELS[locale]}
            {t?.translatedBy === 'ai' && ' · AI'}
            {t?.outdated && ' ⚠'}
          </Badge>
        )
      })}
    </div>
  )
}
