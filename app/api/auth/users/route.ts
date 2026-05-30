import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('user_info')
    .select('usr_no, usr_nm, dept_no, role_cd, use_yn')
    .order('usr_nm')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  const { usr_no, role_cd } = await req.json()
  if (!usr_no || !role_cd)
    return NextResponse.json({ error: 'usr_no, role_cd 필수' }, { status: 400 })

  const ALLOWED_ROLES = new Set(['ADMIN','MASTER','MANAGER','SUBMANAGER','USER'])
  if (!ALLOWED_ROLES.has(role_cd))
    return NextResponse.json({ error: '허용되지 않은 역할' }, { status: 400 })

  // ADMIN은 최대 1명 제약
  if (role_cd === 'ADMIN') {
    const { count } = await supabaseAdmin
      .from('user_info')
      .select('*', { count: 'exact', head: true })
      .eq('role_cd', 'ADMIN')
      .neq('usr_no', usr_no)
    if ((count ?? 0) >= 1)
      return NextResponse.json({ error: 'ADMIN은 1명만 가능합니다' }, { status: 409 })
  }

  // MASTER는 최대 2명 제약
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
