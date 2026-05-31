import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { createAdminToken, verifyAdminToken } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'

// 공개 경로 (인증 없이 접근 가능)
const PUBLIC_PATHS = ['/login', '/signup', '/auth/callback']

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )
}

// profiles.main_role 조회 (서비스 롤로 RLS 우회)
async function getProfileRole(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('main_role')
    .eq('user_id', userId)
    .maybeSingle()
  return data?.main_role ?? null
}

// 관리자 접근 허용 역할
const ADMIN_ROLES = new Set(['admin', 'master'])

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // Supabase 세션 쿠키 갱신
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // API 라우트 — 자체 requireAuth 처리
  if (pathname.startsWith('/api/')) return supabaseResponse

  // ── /admin 경로: Supabase 인증 + profiles.main_role 역할 검증 ──
  if (pathname.startsWith('/admin')) {

    // 미인증 → Supabase 로그인 페이지로
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // profiles.main_role 조회
    const role = await getProfileRole(user.id)

    // admin/master 이외 역할 → 홈으로 (권한 없음)
    if (!role || !ADMIN_ROLES.has(role)) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // admin/master 확인 → admin-session 쿠키 자동 발급 (API 인증용)
    const existingToken = request.cookies.get('admin-session')?.value
    if (!existingToken || !verifyAdminToken(existingToken)) {
      const token = createAdminToken()
      supabaseResponse.cookies.set('admin-session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60,
        path: '/',
      })
    }

    return supabaseResponse
  }

  // 비인증 사용자 → /login 리다이렉트
  if (!user && !isPublicPath(pathname)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 인증 사용자가 auth 페이지 접근 → 메인으로
  if (user && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
