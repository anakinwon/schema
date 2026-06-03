import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { setAdminSessionCookie } from '@/lib/admin-auth'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { writeSecurityAudit } from '@/lib/audit'

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const { allowed, remaining, resetAt } = checkRateLimit(`admin-login:${ip}`, 10, 60_000)

  if (!allowed) {
    const retryAfter = Math.ceil((resetAt - Date.now()) / 1000)
    return NextResponse.json(
      { error: `요청이 너무 많습니다. ${retryAfter}초 후 다시 시도하세요.` },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    )
  }

  const { password } = await request.json()

  const adminPassword = process.env.ADMIN_PASSWORD
  const adminSecretKey = process.env.ADMIN_SECRET_KEY

  if (!adminPassword || !adminSecretKey) {
    return NextResponse.json(
      { error: '서버 설정 오류: 관리자 비밀번호가 구성되지 않았습니다' },
      { status: 500 },
    )
  }

  if (!password || !safeCompare(password, adminPassword)) {
    writeSecurityAudit({ eventType: 'LOGIN_FAILURE', actor: 'unknown', ip, detail: '관리자 패스워드 불일치' })
    return NextResponse.json(
      { error: '비밀번호가 올바르지 않습니다', remaining },
      { status: 401 },
    )
  }

  writeSecurityAudit({ eventType: 'ADMIN_LOGIN', actor: 'admin', ip })
  const response = NextResponse.json({ ok: true })
  setAdminSessionCookie(response)
  return response
}
