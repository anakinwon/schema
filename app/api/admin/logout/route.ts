import { NextRequest, NextResponse } from 'next/server'
import { clearAdminSessionCookie } from '@/lib/admin-auth'

// redirect 대신 JSON 반환 — fetch redirect follow 로 인한 브라우저 URL 변경 방지
// 클라이언트(AdminLogoutButton)에서 router.push() 로 직접 이동
export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true })
  clearAdminSessionCookie(response)
  return response
}
