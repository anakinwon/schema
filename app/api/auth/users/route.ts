import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
  // 조회는 ADMIN/MASTER만
  const auth = await requireAuth(req, ['ADMIN', 'MASTER'])
  if (!auth.ok) return auth.response

  const { data, error } = await supabaseAdmin
    .from('user_info')
    .select('usr_no, usr_nm, dept_no, role_cd, use_yn')
    .order('usr_nm')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  // 역할 변경은 ADMIN/MASTER만
  const auth = await requireAuth(req, ['ADMIN', 'MASTER'])
  if (!auth.ok) return auth.response

  const { usr_no, role_cd } = await req.json()
  if (!usr_no || !role_cd)
    return NextResponse.json({ error: 'usr_no, role_cd 필수' }, { status: 400 })

  const ALLOWED_ROLES = new Set(['ADMIN', 'MASTER', 'MANAGER', 'SUBMANAGER', 'USER'])
  if (!ALLOWED_ROLES.has(role_cd))
    return NextResponse.json({ error: '허용되지 않은 역할' }, { status: 400 })

  // MASTER는 ADMIN 역할을 부여할 수 없음
  if (auth.role_cd === 'MASTER' && role_cd === 'ADMIN')
    return NextResponse.json({ error: 'MASTER는 ADMIN 역할을 부여할 수 없습니다' }, { status: 403 })

  // ADMIN 최대 1명 제약
  if (role_cd === 'ADMIN') {
    const { count } = await supabaseAdmin
      .from('user_info')
      .select('*', { count: 'exact', head: true })
      .eq('role_cd', 'ADMIN')
      .neq('usr_no', usr_no)
    if ((count ?? 0) >= 1)
      return NextResponse.json({ error: 'ADMIN은 1명만 가능합니다' }, { status: 409 })
  }

  // MASTER 최대 2명 제약
  if (role_cd === 'MASTER') {
    const { count } = await supabaseAdmin
      .from('user_info')
      .select('*', { count: 'exact', head: true })
      .eq('role_cd', 'MASTER')
      .neq('usr_no', usr_no)
    if ((count ?? 0) >= 2)
      return NextResponse.json({ error: 'MASTER는 최대 2명까지 가능합니다' }, { status: 409 })
  }

  const { error } = await supabaseAdmin
    .from('user_info')
    .update({ role_cd })
    .eq('usr_no', usr_no)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
