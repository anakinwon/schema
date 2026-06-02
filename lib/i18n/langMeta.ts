// locale 코드 → 언어 메타데이터 (폰트키·텍스트방향·자국어명)
// 언어 추가 시 i18n_lang_mst에 자동 채울 값
interface LangMeta {
  fontKey:  string          // lib/fonts.ts 폰트키 (kr·sc·jp·thai·deva·latin)
  dir:      'ltr' | 'rtl'
  nativeNm: string          // 자국어 언어명
}

export const LANG_META: Record<string, LangMeta> = {
  // 기본 11개 언어
  ko:      { fontKey: 'kr',    dir: 'ltr', nativeNm: '한국어' },
  en:      { fontKey: 'latin', dir: 'ltr', nativeNm: 'English' },
  zh:      { fontKey: 'sc',    dir: 'ltr', nativeNm: '中文' },
  ja:      { fontKey: 'jp',    dir: 'ltr', nativeNm: '日本語' },
  hi:      { fontKey: 'deva',  dir: 'ltr', nativeNm: 'हिन्दी' },
  vi:      { fontKey: 'latin', dir: 'ltr', nativeNm: 'Tiếng Việt' },
  id:      { fontKey: 'latin', dir: 'ltr', nativeNm: 'Bahasa Indonesia' },
  ms:      { fontKey: 'latin', dir: 'ltr', nativeNm: 'Bahasa Melayu' },
  'en-ZA': { fontKey: 'latin', dir: 'ltr', nativeNm: 'English (SA)' },
  fil:     { fontKey: 'latin', dir: 'ltr', nativeNm: 'Filipino' },
  th:      { fontKey: 'thai',  dir: 'ltr', nativeNm: 'ไทย' },

  // 유럽 (라틴 계열)
  de:      { fontKey: 'latin', dir: 'ltr', nativeNm: 'Deutsch' },
  fr:      { fontKey: 'latin', dir: 'ltr', nativeNm: 'Français' },
  es:      { fontKey: 'latin', dir: 'ltr', nativeNm: 'Español' },
  it:      { fontKey: 'latin', dir: 'ltr', nativeNm: 'Italiano' },
  pt:      { fontKey: 'latin', dir: 'ltr', nativeNm: 'Português' },
  nl:      { fontKey: 'latin', dir: 'ltr', nativeNm: 'Nederlands' },
  pl:      { fontKey: 'latin', dir: 'ltr', nativeNm: 'Polski' },
  sv:      { fontKey: 'latin', dir: 'ltr', nativeNm: 'Svenska' },
  no:      { fontKey: 'latin', dir: 'ltr', nativeNm: 'Norsk' },
  da:      { fontKey: 'latin', dir: 'ltr', nativeNm: 'Dansk' },
  fi:      { fontKey: 'latin', dir: 'ltr', nativeNm: 'Suomi' },
  cs:      { fontKey: 'latin', dir: 'ltr', nativeNm: 'Čeština' },
  hu:      { fontKey: 'latin', dir: 'ltr', nativeNm: 'Magyar' },
  ro:      { fontKey: 'latin', dir: 'ltr', nativeNm: 'Română' },
  tr:      { fontKey: 'latin', dir: 'ltr', nativeNm: 'Türkçe' },

  // 키릴 문자
  ru:      { fontKey: 'latin', dir: 'ltr', nativeNm: 'Русский' },
  uk:      { fontKey: 'latin', dir: 'ltr', nativeNm: 'Українська' },
  bg:      { fontKey: 'latin', dir: 'ltr', nativeNm: 'Български' },
  sr:      { fontKey: 'latin', dir: 'ltr', nativeNm: 'Српски' },

  // 그리스어
  el:      { fontKey: 'latin', dir: 'ltr', nativeNm: 'Ελληνικά' },

  // RTL 언어 (오른쪽→왼쪽)
  ar:      { fontKey: 'latin', dir: 'rtl', nativeNm: 'العربية' },
  he:      { fontKey: 'latin', dir: 'rtl', nativeNm: 'עברית' },
  fa:      { fontKey: 'latin', dir: 'rtl', nativeNm: 'فارسی' },
  ur:      { fontKey: 'latin', dir: 'rtl', nativeNm: 'اردو' },
  ps:      { fontKey: 'latin', dir: 'rtl', nativeNm: 'پښتو' },

  // 남아시아 (별도 문자)
  bn:      { fontKey: 'latin', dir: 'ltr', nativeNm: 'বাংলা' },
  ne:      { fontKey: 'deva',  dir: 'ltr', nativeNm: 'नेपाली' },
  si:      { fontKey: 'latin', dir: 'ltr', nativeNm: 'සිංහල' },
  km:      { fontKey: 'latin', dir: 'ltr', nativeNm: 'ខ្មែរ' },
  my:      { fontKey: 'latin', dir: 'ltr', nativeNm: 'မြန်မာ' },
}

// RTL 언어인지 (font/방향 없으면 기본 ltr·latin)
export function getLangMeta(locale: string): LangMeta {
  return LANG_META[locale] ?? { fontKey: 'latin', dir: 'ltr', nativeNm: locale }
}
