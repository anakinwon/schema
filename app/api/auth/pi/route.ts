import { NextRequest, NextResponse } from 'next/server'

const PI_API_URL = 'https://api.minepi.com/v2/me'

export async function POST(request: NextRequest) {
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

  // uid → 식별자, username → 표시 이름(이메일 미제공이므로 uid 대체)
  const sessionData = {
    uid: piUser.uid,
    displayName: piUser.username ?? `pi_${piUser.uid.slice(0, 8)}`,
    username: piUser.username ?? null,
    scopesGranted: piUser.credentials.scopes,
    tokenValidUntil: piUser.credentials.valid_until.iso8601,
  }

  const response = NextResponse.json({ success: true, user: sessionData })

  response.cookies.set('pi_session', JSON.stringify(sessionData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  return response
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete('pi_session')
  return response
}
