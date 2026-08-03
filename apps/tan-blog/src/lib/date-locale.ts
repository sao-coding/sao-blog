import 'dayjs/locale/zh-tw'
import 'dayjs/locale/en'
import 'dayjs/locale/ja'
import { enUS, ja, zhTW } from 'date-fns/locale'
import { getLocale } from '#/paraglide/runtime'

export function dayjsLocale(): string {
  switch (getLocale()) {
    case 'en':
      return 'en'
    case 'ja':
      return 'ja'
    default:
      return 'zh-tw'
  }
}

export function dateFnsLocale() {
  switch (getLocale()) {
    case 'en':
      return enUS
    case 'ja':
      return ja
    default:
      return zhTW
  }
}
