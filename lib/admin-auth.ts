import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

const ADMIN_COOKIE = 'admin-session'
const MAX_AGE_MS = 24 * 60 * 60 * 1000 // 24시간

// HMAC-SHA256 서명 토큰 생성
// 형식: nonce.timestamp.signature
// secret key는 서버에만 존재하며, 쿠키에는 절대 포함되지 않음
export function createAdminToken(): string {
  const secret = process.env.ADMIN_SECRET_KEY!
  const nonce = crypto.randomBytes(16).toString('hex')
  const timestamp = Date.now().toString()
  const payload = `${nonce}.${timestamp}`

  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  return `${payload}.${signature}`
}

// HMAC 서명 검증 (타이밍 안전 비교)
export function verifyAdminToken(token: string): boolean {
  const secret = process.env.ADMIN_SECRET_KEY
  if (!secret) return false

  const parts = token.split('.')
  if (parts.length !== 3) return false
  const [nonce, timestamp, signature] = parts

  // 만료 검사
  const age = Date.now() - parseInt(timestamp, 10)
  if (isNaN(age) || age > MAX_AGE_MS) return false

  // HMAC 재계산
  const payload = `${nonce}.${timestamp}`
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  // 타이밍 공격 방지: timingSafeEqual로 비교
  const sigBuf = Buffer.from(signature, 'hex')
  const expectedBuf = Buffer.from(expectedSig, 'hex')
  if (sigBuf.length !== expectedBuf.length) return false

  return crypto.timingSafeEqual(sigBuf, expectedBuf)
}

// 관리자 세션 쿠키 검증
export function isAdminSession(request: NextRequest): boolean {
  const token = request.cookies.get(ADMIN_COOKIE)?.value
  if (!token) return false
  return verifyAdminToken(token)
}

// 관리자 세션 쿠키 설정 (API 응답에 적용)
export function setAdminSessionCookie(response: NextResponse): void {
  const token = createAdminToken()
  response.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE_MS / 1000, // 초 단위
    path: '/',
  })
}

// 관리자 세션 쿠키 삭제 (로그아웃)
export function clearAdminSessionCookie(response: NextResponse): void {
  response.cookies.delete(ADMIN_COOKIE)
}
