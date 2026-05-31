import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from './supabase'
import { isAdminSession } from './admin-auth'

export type AuthResult =
  | { ok: true;  email: string; role_cd: string; usr_no: string | null }
  | { ok: false; response: NextResponse }

/**
 * 인증·인가 검증
 * 1) 관리자 Back Office 쿠키 세션 → ADMIN 역할로 처리 (Bearer 토큰 불필요)
 * 2) Supabase JWT Bearer 토큰 → user_info.role_cd로 역할 인가
 */
export async function requireAuth(
  req: NextRequest,
  allowedRoles: string[],
): Promise<AuthResult> {
  // 관리자 쿠키 세션 — Back Office에서 Bearer 없이 호출되는 경우
  if (isAdminSession(req)) {
    if (!allowedRoles.includes('ADMIN')) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: `권한 없음 — Admin 세션: 필요 역할 ${allowedRoles.join('/')}` },
          { status: 403 },
        ),
      }
    }
    return { ok: true, email: 'admin@system', role_cd: 'ADMIN', usr_no: null }
  }

  // Authorization: Bearer <token> 헤더 추출
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 }),
    }
  }

  // JWT 검증 (Supabase Auth)
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user?.email) {
    return {
      ok: false,
      response: NextResponse.json({ error: '유효하지 않은 세션입니다' }, { status: 401 }),
    }
  }

  // user_info에서 이메일로 역할 조회
  const { data: userInfo } = await supabaseAdmin
    .from('user_info')
    .select('usr_no, role_cd')
    .eq('eml_addr', user.email)
    .maybeSingle()

  const role_cd = userInfo?.role_cd ?? 'USER'

  if (!allowedRoles.includes(role_cd)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `권한 없음 — 현재 역할: ${role_cd}, 필요 역할: ${allowedRoles.join('/')}` },
        { status: 403 },
      ),
    }
  }

  return { ok: true, email: user.email, role_cd, usr_no: userInfo?.usr_no ?? null }
}

/** MANAGER가 특정 그룹의 담당자인지 확인 (그룹 스코프 권한) */
export async function isGroupManager(
  usr_no: string,
  grp_cd: string,
): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('grp_mbr')
    .select('mbr_role_cd')
    .eq('grp_cd', grp_cd)
    .eq('usr_no', usr_no)
    .eq('mbr_role_cd', 'MANAGER')
    .maybeSingle()
  return !!data
}
