import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ['ADMIN', 'MASTER'])
  if (!auth.ok) return auth.response

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, user_id, username, full_name, main_role, avatar_url')
    .order('full_name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// profiles.main_role(소문자) → user_info.role_cd(대문자) 변환 맵
const PROFILE_TO_ROLE_CD: Record<string, string> = {
  admin:     'ADMIN',
  master:    'MASTER',
  manager:   'MANAGER',
  sub_admin: 'SUBMANAGER',
  user:      'USER',
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request, ['ADMIN', 'MASTER'])
  if (!auth.ok) return auth.response

  const { user_id, main_role } = await request.json()
  const ALLOWED_ROLES = ['admin', 'master', 'manager', 'sub_admin', 'user']
  if (!user_id || !ALLOWED_ROLES.includes(main_role)) {
    return NextResponse.json({ error: 'user_id, main_role 필수' }, { status: 400 })
  }

  // 1) profiles.main_role 업데이트
  const { error: profileErr } = await supabaseAdmin
    .from('profiles')
    .update({ main_role })
    .eq('user_id', user_id)

  if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 })

  // 2) user_info.role_cd 동기화 (레코드가 있는 경우만)
  const role_cd = PROFILE_TO_ROLE_CD[main_role]
  const { data: au } = await supabaseAdmin.auth.admin.getUserById(user_id)
  if (au?.user?.email) {
    await supabaseAdmin
      .from('user_info')
      .update({ role_cd })
      .eq('eml_addr', au.user.email)
  }

  return NextResponse.json({ ok: true })
}
