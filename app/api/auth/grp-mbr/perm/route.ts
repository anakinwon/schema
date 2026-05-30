import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
  // 권한 조회: ADMIN/MASTER는 전체, MANAGER는 자신의 그룹, 본인 자신 조회 허용
  const auth = await requireAuth(req, ['ADMIN', 'MASTER', 'MANAGER', 'SUBMANAGER'])
  if (!auth.ok) return auth.response

  const grp_cd = req.nextUrl.searchParams.get('grp_cd') ?? ''
  const usr_no = req.nextUrl.searchParams.get('usr_no') ?? ''
  if (!grp_cd || !usr_no)
    return NextResponse.json({ error: 'grp_cd, usr_no 필수' }, { status: 400 })

  // SUBMANAGER는 자신의 권한만 조회 가능
  if (auth.role_cd === 'SUBMANAGER' && auth.usr_no !== usr_no)
    return NextResponse.json({ error: '본인의 권한만 조회할 수 있습니다' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('grp_mbr_perm')
    .select('perm_cd, grnt_yn')
    .eq('grp_cd', grp_cd)
    .eq('usr_no', usr_no)
    .eq('grnt_yn', 'Y')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
