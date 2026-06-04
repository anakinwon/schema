import createMiddleware from 'next-intl/middleware'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { createAdminToken, verifyAdminToken } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyPiSession } from '@/lib/pi-session'
import { routing } from '@/i18n/routing'

// ── 상수 ──────────────────────────────────────────────────────────────
const PUBLIC_PATHS = ['/login', '/signup', '/auth/callback', '/admin/login', '/alert-demo']
const ADMIN_ROLES  = new Set(['admin', 'master'])

// ── next-intl 미들웨어 인스턴스 ───────────────────────────────────────
const handleI18nRouting = createMiddleware(routing)

// ── 헬퍼 ──────────────────────────────────────────────────────────────

// locale prefix 분리 — 인증 판단은 cleanPath 기준, redirect는 localePrefix 보존
// 예) /en/admin → { cleanPath:'/admin', localePrefix:'/en' }
//     /notice   → { cleanPath:'/notice', localePrefix:'' }  (ko, as-needed)
function extractLocale(pathname: string): { cleanPath: string; localePrefix: string } {
  const seg = pathname.split('/')[1]
  if (seg && (routing.locales as readonly string[]).includes(seg)) {
    const rest = pathname.split('/').slice(2).join('/')
    return { cleanPath: '/' + rest, localePrefix: '/' + seg }
  }
  return { cleanPath: pathname, localePrefix: '' }
}

function isPublicPath(p: string): boolean {
  return PUBLIC_PATHS.some(pub => p === pub || p.startsWith(pub + '/'))
}

async function getProfileRole(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('main_role')
    .eq('user_id', userId)
    .maybeSingle()
  return data?.main_role ?? null
}

// ── 미들웨어 ──────────────────────────────────────────────────────────

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1) API·OAuth 콜백 — 미들웨어 전체 우회 (requireAuth 자체 처리)
  if (pathname.startsWith('/api/') || pathname.startsWith('/auth/')) {
    return NextResponse.next({ request })
  }

  // 2) next-intl locale 협상 + NEXT_LOCALE 쿠키 설정
  //    → 이 response를 베이스로 Supabase 쿠키를 위에 합성
  let response = handleI18nRouting(request)

  // 3) Supabase 세션 갱신 — response 재생성 없이 쿠키만 합성
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          // ⚠️ response 재생성 금지 — intl locale 쿠키 유실 방지
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Pi 세션 확인 — Pi Browser 로그인 사용자도 보호 경로 접근 허용
  const piCookie = request.cookies.get('pi_session')?.value
  const hasPiSession = piCookie ? !!verifyPiSession(piCookie) : false
  // 인증 여부: Supabase 세션 OR Pi 세션 중 하나라도 유효하면 인증됨
  const isAuthed = !!user || hasPiSession

  // 4) 인증 판단 기준: locale prefix 제거한 cleanPath
  const { cleanPath, localePrefix } = extractLocale(pathname)
  // ko (as-needed): localePrefix = ''    → /login
  // en:             localePrefix = '/en' → /en/login

  // 5) /admin 보호: Supabase 인증 + admin/master 역할 검증 (Pi 세션 제외)
  if (cleanPath.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL(`${localePrefix}/login`, request.url))
    }

    const role = await getProfileRole(user.id)
    if (!role || !ADMIN_ROLES.has(role)) {
      return NextResponse.redirect(new URL(`${localePrefix}/`, request.url))
    }

    // admin-session 쿠키 발급 (API 인증용 HMAC 토큰)
    // ADMIN_SECRET_KEY 미설정 시 쿠키 발급 건너뜀 (Back Office API 호출은 Bearer 토큰으로 대체)
    const existing = request.cookies.get('admin-session')?.value
    if (process.env.ADMIN_SECRET_KEY && (!existing || !verifyAdminToken(existing))) {
      response.cookies.set('admin-session', createAdminToken(), {
        httpOnly: true,
        secure:   process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge:   24 * 60 * 60,
        path:     '/',
      })
    }
    return response
  }

  // 6) 비인증 → login (locale prefix 보존)
  if (!isAuthed && !isPublicPath(cleanPath)) {
    return NextResponse.redirect(new URL(`${localePrefix}/login`, request.url))
  }

  // 7) 인증 사용자가 auth 페이지 접근 → 홈 (locale prefix 보존)
  if (isAuthed && (cleanPath === '/login' || cleanPath === '/signup')) {
    return NextResponse.redirect(new URL(`${localePrefix}/`, request.url))
  }

  return response
}

export const config = {
  matcher: [
    // API·auth 콜백·_next 정적 파일·이미지 제외
    '/((?!api|_next/static|_next/image|_next/webpack-hmr|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
