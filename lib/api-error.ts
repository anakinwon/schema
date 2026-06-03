import { NextResponse } from 'next/server'

/**
 * DB/외부 서비스 오류를 클라이언트에 일반화하여 반환합니다.
 * 내부 상세 오류(테이블명·컬럼명·제약조건)는 서버 로그에만 기록합니다.
 */
export function handleDbError(error: unknown, context?: string): NextResponse {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[DB Error]${context ? ` ${context}` : ''}:`, message)
  return NextResponse.json(
    { error: '데이터 처리 중 오류가 발생했습니다' },
    { status: 500 },
  )
}

/**
 * 인증이 필요한 API 응답에 캐시 방지 헤더를 추가합니다.
 * 중간 프록시·CDN이 사용자 개인 데이터를 캐싱하는 것을 방지합니다.
 */
export function noCacheHeaders(): HeadersInit {
  return {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
  }
}
