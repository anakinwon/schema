import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const PI_API_URL = 'https://api.minepi.com/v2/me'

// base64url은 '.'을 포함하지 않으므로 payload.sig 분리가 안전함
function signSession(data: object): string {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET 환경 변수가 설정되지 않았습니다')
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url')
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

export function verifyPiSession(cookie: string): Record<string, unknown> | null {
  const secret = process.env.SESSION_SECRET
  if (!secret) return null
  const dotIdx = cookie.lastIndexOf('.')
  if (dotIdx === -1) return null
  const payload = cookie.slice(0, dotIdx)
  const sig = cookie.slice(dotIdx + 1)
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url')
  // 타이밍 공격 방지: timingSafeEqual 사용
  const sigBuf = Buffer.from(sig)
  const expBuf = Buffer.from(expected)
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString()) as Record<string, unknown>
  } catch {
    return null
  }
}

// CSRF 방어: 변이 요청의 Origin이 앱 사이트와 일치하는지 검증
// Pi Browser WebView는 Origin 헤더를 포함하지 않을 수 있으므로
// 미설정 환경(null/undefined Origin)은 개발 환경에서만 허용
function isOriginAllowed(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

  // 프로덕션에서 NEXT_PUBLIC_SITE_URL 미설정 시 보수적으로 거부
  if (!siteUrl && process.env.NODE_ENV === 'production') return false

  // Origin 헤더가 없으면 허용 (Pi Browser WebView, SSR fetches)
  if (!origin) return true

  // siteUrl 미설정 시 같은 호스트 여부를 Host 헤더로 폴백
  const expected = siteUrl ?? `https://${request.headers.get('host') ?? ''}`
  return origin === expected
}

export async function GET(request: NextRequest) {
  const cookie = request.cookies.get('pi_session')?.value
  if (!cookie) return NextResponse.json({ user: null })
  const data = verifyPiSession(cookie)
  if (!data) return NextResponse.json({ user: null })
  return NextResponse.json({ user: data })
}

export async function POST(request: NextRequest) {
  if (!isOriginAllowed(request)) {
    return NextResponse.json({ error: '허용되지 않은 Origin입니다' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 본문입니다' }, { status: 400 })
  }

  const { accessToken } = body as { accessToken?: string }
  if (!accessToken || typeof accessToken !== 'string') {
    return NextResponse.json({ error: 'accessToken이 필요합니다' }, { status: 400 })
  }

  // Pi Network API로 토큰 검증 — API 키 불필요, accessToken만으로 인증
  let piUser: PiUserDTO
  try {
    const piRes = await fetch(PI_API_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!piRes.ok) {
      return NextResponse.json({ error: 'Pi 토큰 검증 실패' }, { status: 401 })
    }
    piUser = (await piRes.json()) as PiUserDTO
  } catch {
    return NextResponse.json({ error: 'Pi Network API 연결 실패' }, { status: 502 })
  }

  const sessionData = {
    uid: piUser.uid,
    displayName: piUser.username ?? `pi_${piUser.uid.slice(0, 8)}`,
    username: piUser.username ?? null,
    scopesGranted: piUser.credentials.scopes,
    tokenValidUntil: piUser.credentials.valid_until.iso8601,
  }

  let signedCookie: string
  try {
    signedCookie = signSession(sessionData)
  } catch (err) {
    console.error('[Pi] 세션 서명 실패:', err)
    return NextResponse.json({ error: '서버 설정 오류' }, { status: 500 })
  }

  const response = NextResponse.json({ success: true, user: sessionData })

  response.cookies.set('pi_session', signedCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    // Pi 토큰 유효기간(tokenValidUntil)과 동기화가 이상적이나,
    // 클라이언트가 재인증할 수 있으므로 7일 고정으로 단순화
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  return response
}

export async function DELETE(request: NextRequest) {
  if (!isOriginAllowed(request)) {
    return NextResponse.json({ error: '허용되지 않은 Origin입니다' }, { status: 403 })
  }

  const response = NextResponse.json({ success: true })
  response.cookies.delete('pi_session')
  return response
}
