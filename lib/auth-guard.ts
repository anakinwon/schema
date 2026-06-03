import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from './supabase'
import { isAdminSession } from './admin-auth'

export type AuthResult =
  | { ok: true;  email: string; role_cd: string; usr_no: string | null; user_id: string | null }
  | { ok: false; response: NextResponse }

// profiles.main_role(소문자) → auth 역할 코드(대문자) 매핑
// profiles가 47명 기준 단일 소스, user_info.role_cd는 동기화 불완전 상태
const PROFILE_ROLE_MAP: Record<string, string> = {
  admin:     'ADMIN',
  master:    'MASTER',
  manager:   'MANAGER',
  sub_admin: 'SUBMANAGER',
  user:      'USER',
}

/**
 * 인증·인가 검증
 * 1) 관리자 Back Office 쿠키 세션 → ADMIN 역할로 처리 (Bearer 토큰 불필요)
 * 2) Supabase JWT Bearer 토큰 → profiles.main_role로 역할 인가 (단일 소스)
 */
export async function requireAuth(
  req: NextRequest,
  allowedRoles: string[],
): Promise<AuthResult> {
  // Bearer 토큰 우선 — 있으면 항상 JWT 검증 (admin 쿠키보다 우선)
  // admin 쿠키가 브라우저에 남아있어도 Bearer가 있으면 사용자 세션을 정확히 식별해야 함
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')

  // 관리자 쿠키 세션 — Bearer 없이 Back Office에서 호출되는 경우에만 사용
  if (!token && isAdminSession(req)) {
    if (!allowedRoles.includes('ADMIN')) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: `권한 없음 — Admin 세션: 필요 역할 ${allowedRoles.join('/')}` },
          { status: 403 },
        ),
      }
    }
    return { ok: true, email: 'admin@system', role_cd: 'ADMIN', usr_no: null, user_id: null }
  }

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

  // profiles + user_info 병렬 조회 (순차 → 병렬로 변경하여 ~100ms 단축)
  const [{ data: profile }, { data: userInfo }] = await Promise.all([
    supabaseAdmin.from('profiles').select('main_role').eq('user_id', user.id).maybeSingle(),
    supabaseAdmin.from('user_info').select('usr_no').eq('eml_addr', user.email).maybeSingle(),
  ])

  const role_cd = PROFILE_ROLE_MAP[profile?.main_role ?? 'user'] ?? 'USER'

  if (!allowedRoles.includes(role_cd)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `권한 없음 — 현재 역할: ${role_cd}, 필요 역할: ${allowedRoles.join('/')}` },
        { status: 403 },
      ),
    }
  }

  return { ok: true, email: user.email, role_cd, usr_no: userInfo?.usr_no ?? null, user_id: user.id }
}

/**
 * 경량 인증 — JWT 유효성만 검증 (역할 체크 없음)
 * 모든 로그인 사용자에게 허용되는 엔드포인트에 사용.
 * requireAuth 대비 Supabase API 호출 3회 → 1회로 단축.
 */
export async function requireAnyAuth(req: NextRequest): Promise<AuthResult> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')

  if (!token && isAdminSession(req)) {
    return { ok: true, email: 'admin@system', role_cd: 'ADMIN', usr_no: null, user_id: null }
  }

  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 }),
    }
  }

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user?.email) {
    return {
      ok: false,
      response: NextResponse.json({ error: '유효하지 않은 세션입니다' }, { status: 401 }),
    }
  }

  return { ok: true, email: user.email, role_cd: 'USER', usr_no: null, user_id: user.id }
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
