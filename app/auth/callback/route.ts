import { createSupabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

// next 파라미터를 동일 오리진 상대경로로만 허용 (Open Redirect 방지)
function sanitizeNext(next: string | null): string {
  if (!next) return '/'
  // 반드시 '/'로 시작하고, '//'나 '/\' (프로토콜 상대 URL)이 아니어야 함
  if (next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\')) {
    return next
  }
  return '/'
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const safeNext = sanitizeNext(searchParams.get('next'))
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // OAuth 공급자 오류 처리
  if (error) {
    const msg = encodeURIComponent(errorDescription ?? error)
    return NextResponse.redirect(new URL(`/login?error=${msg}`, origin))
  }

  if (code) {
    const supabase = await createSupabaseServer()
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (!exchangeError && data.user) {
      // 신규 사용자인 경우 user_info에 USER 역할 자동 부여
      await ensureUserInfo(data.user.id, data.user.email ?? '')
      return NextResponse.redirect(new URL(safeNext, origin))
    }
  }

  return NextResponse.redirect(new URL('/login?error=oauth_callback_failed', origin))
}

// user_info 레코드가 없으면 USER 역할로 자동 생성
async function ensureUserInfo(_authId: string, email: string) {
  const { data: existing } = await supabaseAdmin
    .from('user_info')
    .select('usr_no')
    .eq('eml_addr', email)
    .maybeSingle()

  if (!existing) {
    // usr_no: varchar(10) — "U" + 9자리 타임스탬프 끝자리
    const usr_no = 'U' + Date.now().toString().slice(-9)
    await supabaseAdmin.from('user_info').insert({
      usr_no,
      eml_addr: email,
      usr_nm: email.split('@')[0],
      role_cd: 'USER',
      use_yn: 'Y',
    })
  }
}
