import { NextRequest, NextResponse } from 'next/server'
import { setAdminSessionCookie } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  const { password } = await request.json()

  const adminPassword = process.env.ADMIN_PASSWORD
  const adminSecretKey = process.env.ADMIN_SECRET_KEY

  if (!adminPassword || !adminSecretKey) {
    return NextResponse.json(
      { error: '서버 설정 오류: 관리자 비밀번호가 구성되지 않았습니다' },
      { status: 500 }
    )
  }

  if (!password || password !== adminPassword) {
    // 브루트포스 방지 — 실패 시 일관된 응답
    return NextResponse.json({ error: '비밀번호가 올바르지 않습니다' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  setAdminSessionCookie(response)
  return response
}
