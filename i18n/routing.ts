import { defineRouting } from 'next-intl/routing'
import { LOCALES, DEFAULT_LOCALE, LOCALE_PREFIX } from '@/lib/i18n/locales'

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: LOCALE_PREFIX,
})

export type Locale = (typeof routing.locales)[number]
