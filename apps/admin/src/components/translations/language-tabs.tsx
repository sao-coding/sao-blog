import { useQuery } from '@tanstack/react-query'
import { Tabs, TabsList, TabsTrigger } from '@sao-blog/ui/components/tabs'
import { cn } from '@sao-blog/ui/lib/utils'
import { orpc } from '@/utils/orpc'
import { isPublished, LOCALE_LABELS, LOCALES, type Locale, type TranslationState } from './locales'

/** "source" = 原文表單；其他值為譯文語系 */
export type LanguageTab = 'source' | Locale

/** 讀取文章 / 日記的各語言版本狀態（分頁圓點用），並算出原文語系 */
export function useTranslationStates(kind: 'post' | 'note', ownerId: string | undefined) {
  const enabled = Boolean(ownerId)
  const post = useQuery({
    ...orpc.admin.post.getPostTranslations.queryOptions({ input: { postId: ownerId ?? '' } }),
    enabled: enabled && kind === 'post',
  })
  const note = useQuery({
    ...orpc.admin.note.getNoteTranslations.queryOptions({ input: { noteId: ownerId ?? '' } }),
    enabled: enabled && kind === 'note',
  })
  const states: TranslationState[] = (kind === 'post' ? post.data?.data : note.data?.data) ?? []
  const sourceLocale: Locale = states.find((s) => s.isSource)?.locale ?? 'zh-TW'
  return { states, sourceLocale }
}

const dotClass = (state?: TranslationState) =>
  cn(
    'size-1.5 rounded-full',
    !state && 'border border-muted-foreground/50',
    state && state.outdated && 'bg-amber-500',
    state && !state.outdated && isPublished(state.status) && 'bg-green-500',
    state && !state.outdated && !isPublished(state.status) && 'bg-muted-foreground/50'
  )

/** 編輯器頂部的語言分頁：原文 + 其他語系（圓點：綠 已發布／灰 草稿／琥珀 過期／空心 尚未建立） */
export function LanguageTabs({
  value,
  onValueChange,
  sourceLocale,
  states,
}: {
  value: LanguageTab
  onValueChange: (value: LanguageTab) => void
  sourceLocale: Locale
  states: TranslationState[]
}) {
  const byLocale = new Map(states.map((s) => [s.locale, s]))

  return (
    <Tabs value={value} onValueChange={(v) => onValueChange(v as LanguageTab)}>
      <TabsList>
        <TabsTrigger value="source" className="gap-1.5 px-3">
          <span className={dotClass(byLocale.get(sourceLocale))} />
          {LOCALE_LABELS[sourceLocale]}（原文）
        </TabsTrigger>
        {LOCALES.filter((l) => l !== sourceLocale).map((locale) => (
          <TabsTrigger key={locale} value={locale} className="gap-1.5 px-3">
            <span className={dotClass(byLocale.get(locale))} />
            {LOCALE_LABELS[locale]}
            {byLocale.get(locale)?.outdated && <span className="text-amber-600">⚠</span>}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
