// ISO 3166-1 alpha-2 코드 → Regional Indicator Symbol 이모지 국기
// 'KR' → '🇰🇷', 'US' → '🇺🇸'
export function countryToFlag(code: string): string {
  return code
    .toUpperCase()
    .split('')
    .map(ch => String.fromCodePoint(ch.charCodeAt(0) - 65 + 0x1F1E6))
    .join('')
}
