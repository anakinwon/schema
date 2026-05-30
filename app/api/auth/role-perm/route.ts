import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
  // 권한 매트릭스 조회는 ADMIN/MASTER만
  const auth = await requireAuth(req, ['ADMIN', 'MASTER'])
  if (!auth.ok) return auth.response

  const { data, error } = await supabaseAdmin
    .from('role_perm')
    .select('role_cd, perm_cd, grnt_yn')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  // 역할-권한 변경은 ADMIN만 (MASTER도 자신보다 상위 권한은 부여 불가)
  const auth = await requireAuth(req, ['ADMIN', 'MASTER'])
  if (!auth.ok) return auth.response

  const { role_cd, perm_cd, grnt_yn } = await req.json()

  // MASTER는 ADMIN 역할의 권한을 변경할 수 없음
  if (auth.role_cd === 'MASTER' && role_cd === 'ADMIN')
    return NextResponse.json({ error: 'MASTER는 ADMIN 역할의 권한을 변경할 수 없습니다' }, { status: 403 })

  if (grnt_yn === 'Y') {
    const { error } = await supabaseAdmin
      .from('role_perm')
      .upsert({ role_cd, perm_cd, grnt_yn: 'Y' }, { onConflict: 'role_cd,perm_cd' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabaseAdmin
      .from('role_perm')
      .delete()
      .eq('role_cd', role_cd)
      .eq('perm_cd', perm_cd)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
