import { getLocale, locales, setLocale } from '#/paraglide/runtime'
import { m } from '#/paraglide/messages'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Locale = (typeof locales)[number]

const LOCALE_LABELS: Record<Locale, string> = {
  'zh-Hant': '繁體中文',
  en: 'English',
  ja: '日本語',
}

export function LocaleSwitcher() {
  const currentLocale = getLocale()

  return (
    <Select
      value={currentLocale}
      onValueChange={(value) => setLocale(value as Locale)}
    >
      <SelectTrigger size="sm" aria-label={m.footer_language_label()} className="w-28">
        <SelectValue>{(value: Locale) => LOCALE_LABELS[value]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {locales.map((locale) => (
          <SelectItem key={locale} value={locale}>
            {LOCALE_LABELS[locale]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
