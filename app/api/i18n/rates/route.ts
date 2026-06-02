import { NextResponse } from 'next/server'

// 1시간 캐싱 — 환율은 하루 1회 업데이트됨
export const revalidate = 3600

// KRW 기준 환율 조회 (API 키 불필요)
// 응답: { rates: { USD: 0.000741, ... } } → 1 KRW = X 외화
// 콤보박스: 1/rates[code] = 1 외화당 원화
export async function GET() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/KRW', {
      next: { revalidate: 3600 },
    })
    if (!res.ok) throw new Error('환율 API 응답 오류')

    const data = await res.json()
    if (data.result !== 'success') throw new Error('환율 데이터 오류')

    return NextResponse.json({
      base:      'KRW',
      rates:     data.rates as Record<string, number>,
      updatedAt: data.time_last_update_utc ?? null,
    })
  } catch (e) {
    // 실패 시 빈 rates 반환 — 콤보박스는 환율 없이 동작
    console.error('[rates API]', e)
    return NextResponse.json({ base: 'KRW', rates: {}, updatedAt: null }, { status: 200 })
  }
}
