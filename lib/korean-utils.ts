// 한글 초성 19개
const INITIALS = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']

// 문자열에서 초성만 추출 (한글이 아닌 문자는 그대로)
export function extractInitials(text: string): string {
  return text.split('').map(ch => {
    const code = ch.charCodeAt(0) - 0xAC00
    if (code < 0 || code > 11171) return ch
    return INITIALS[Math.floor(code / 588)]
  }).join('')
}

// 입력값이 초성만으로 구성된 검색어인지 판별
export function isInitialSearch(q: string): boolean {
  return q.length > 0 && /^[ㄱ-ㅎ]+$/.test(q)
}

// 초성 검색: target 문자열이 query 초성 패턴을 포함하는지
export function matchesInitial(target: string, query: string): boolean {
  const targetInitials = extractInitials(target)
  return targetInitials.includes(query)
}

// 통합 매칭: 일반 포함 검색 OR 초성 검색
export function matchesQuery(target: string, q: string): boolean {
  if (!q) return true
  if (isInitialSearch(q)) return matchesInitial(target, q)
  return target.toLowerCase().includes(q.toLowerCase())
}
