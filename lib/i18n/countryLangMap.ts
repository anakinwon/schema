// 국가 코드(ISO 3166-1 alpha-2) → 언어 코드 매핑
// i18n_cntry_mst.locale_cd 가 NULL인 국가의 언어를 추론할 때 사용
// 주의: 실제 적용 시 i18n_lang_mst(use_yn='Y')에 등록된 언어만 유효 (FK 제약)
export const COUNTRY_TO_LANG: Record<string, string> = {
  // 기본 11개국 (시드 시 이미 매핑됨)
  KR: 'ko', US: 'en', CN: 'zh', JP: 'ja', IN: 'hi', VN: 'vi',
  ID: 'id', MY: 'ms', ZA: 'en-ZA', PH: 'fil', TH: 'th',

  // 영어권
  GB: 'en', AU: 'en', CA: 'en', IE: 'en', NZ: 'en', SG: 'en',

  // 스페인어권
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', PE: 'es', CL: 'es', VE: 'es',

  // 아랍어권
  SA: 'ar', AE: 'ar', EG: 'ar', IQ: 'ar', JO: 'ar', LB: 'ar',
  LY: 'ar', MA: 'ar', OM: 'ar', QA: 'ar', SD: 'ar', SY: 'ar', TN: 'ar', YE: 'ar', KW: 'ar', BH: 'ar', DZ: 'ar',

  // 프랑스어권
  FR: 'fr', BE: 'fr', CH: 'fr', CD: 'fr', SN: 'fr', CI: 'fr', CM: 'fr', MG: 'fr', NE: 'fr', ML: 'fr', BF: 'fr',

  // 독일어권
  DE: 'de', AT: 'de', LI: 'de',

  // 포르투갈어권
  PT: 'pt', BR: 'pt', AO: 'pt', MZ: 'pt',

  // 러시아어권
  RU: 'ru', BY: 'ru', KG: 'ru',

  // 기타 유럽
  IT: 'it', NL: 'nl', PL: 'pl', SE: 'sv', NO: 'no', DK: 'da', FI: 'fi',
  GR: 'el', CZ: 'cs', HU: 'hu', RO: 'ro', BG: 'bg', HR: 'hr', SK: 'sk',
  UA: 'uk', RS: 'sr', SI: 'sl', LT: 'lt', LV: 'lv', EE: 'et', IS: 'is',
  AL: 'sq', MK: 'mk', BA: 'bs', ME: 'cnr',

  // 중동·중앙아시아
  IL: 'he', IR: 'fa', AF: 'ps', TR: 'tr',
  AZ: 'az', GE: 'ka', AM: 'hy', KZ: 'kk', UZ: 'uz', MN: 'mn',

  // 남·동남아시아
  BD: 'bn', PK: 'ur', LK: 'si', NP: 'ne', KH: 'km', MM: 'my',

  // 아프리카
  ET: 'am', NG: 'yo', KE: 'sw', TZ: 'sw', UG: 'sw', ZW: 'sn', GH: 'ak',
}

// country_cd → 추론 언어 코드 (없으면 null)
export function inferLocale(countryCd: string): string | null {
  return COUNTRY_TO_LANG[countryCd.toUpperCase()] ?? null
}
