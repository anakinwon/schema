import { NextRequest, NextResponse } from 'next/server'
import { isAdminSession } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  if (!isAdminSession(request)) {
    return NextResponse.json({ error: '관리자 인증 필요' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, user_id, username, full_name, main_role, avatar_url')
    .order('full_name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function PATCH(request: NextRequest) {
  if (!isAdminSession(request)) {
    return NextResponse.json({ error: '관리자 인증 필요' }, { status: 401 })
  }

  const { user_id, main_role } = await request.json()
  const ALLOWED_ROLES = ['admin', 'master', 'manager', 'sub_admin', 'user']
  if (!user_id || !ALLOWED_ROLES.includes(main_role)) {
    return NextResponse.json({ error: 'user_id, main_role 필수' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ main_role })
    .eq('user_id', user_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
