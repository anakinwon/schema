import { getRequestConfig } from 'next-intl/server'
import { hasLocale } from 'next-intl'
import { routing } from './routing'

// 중첩 객체 deep merge: base 위에 override 덮어씌우기
// locale에 번역 키가 없으면 en fallback이 그대로 사용됨
function deepMerge(
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...base }
  for (const key of Object.keys(override)) {
    const ov = override[key]
    const ba = base[key]
    if (ov && typeof ov === 'object' && !Array.isArray(ov) &&
        ba && typeof ba === 'object' && !Array.isArray(ba)) {
      result[key] = deepMerge(ba as Record<string, unknown>, ov as Record<string, unknown>)
    } else {
      result[key] = ov
    }
  }
  return result
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale

  // ko: 직접 사용 (기본 locale)
  if (locale === 'ko') {
    return { locale, messages: (await import('../messages/ko.json')).default }
  }

  // en: 직접 사용 (완전 번역됨, fallback 소스)
  const enMessages = (await import('../messages/en.json')).default as Record<string, unknown>

  if (locale === 'en') {
    return { locale, messages: enMessages }
  }

  // 그 외 locale: en 기본값 위에 locale 번역 덮어씌우기
  // → locale에 번역 키가 없으면 자동으로 영어로 표시
  let specificMessages: Record<string, unknown> = {}
  try {
    specificMessages = (await import(`../messages/${locale}.json`)).default as Record<string, unknown>
  } catch {
    // 파일이 없거나 비어있으면 en 전용 사용
  }

  return {
    locale,
    messages: deepMerge(enMessages, specificMessages),
  }
})
