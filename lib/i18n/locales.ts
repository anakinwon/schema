// 런타임용 locale 목록 — .claude/skills/multi-lang/lang_cd/supported_locales.json 기반
// 스킬 폴더를 앱 번들에서 직접 import 하면 경로 이슈가 생기므로 여기서 관리
export const LOCALES = [
  'ko', 'en', 'zh', 'ja', 'hi', 'vi', 'id', 'ms', 'en-ZA', 'fil', 'th',
  'de', 'ps', 'sq', 'it', 'es', 'fr',
] as const

export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'ko'

export const LOCALE_PREFIX = 'as-needed' as const
