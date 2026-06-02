import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { getActiveFontClass } from '@/lib/fonts'
import { LocaleHtmlUpdater } from './LocaleHtmlUpdater'

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  if (!hasLocale(routing.locales, locale)) notFound()

  setRequestLocale(locale)

  return (
    <NextIntlClientProvider>
      {/* 하이드레이션 후 html[lang] 과 폰트 클래스를 locale에 맞게 갱신 */}
      <LocaleHtmlUpdater locale={locale} fontClass={getActiveFontClass(locale)} />
      {children}
    </NextIntlClientProvider>
  )
}
