import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth, isGroupManager } from '@/lib/auth-guard'

const ALLOWED_MBR_ROLES = new Set(['MANAGER', 'SUBMANAGER', 'USER'])

export async function POST(req: NextRequest) {
  // 구성원 추가: ADMIN/MASTER 전체 가능, MANAGER는 자신의 그룹만
  const auth = await requireAuth(req, ['ADMIN', 'MASTER', 'MANAGER'])
  if (!auth.ok) return auth.response

  const { grp_cd, usr_no, mbr_role_cd } = await req.json()
  if (!ALLOWED_MBR_ROLES.has(mbr_role_cd))
    return NextResponse.json({ error: '허용되지 않은 구성원 역할' }, { status: 400 })

  // MANAGER는 자신이 담당하는 그룹만 수정 가능
  if (auth.role_cd === 'MANAGER') {
    const owns = auth.usr_no ? await isGroupManager(auth.usr_no, grp_cd) : false
    if (!owns)
      return NextResponse.json({ error: '해당 그룹의 담당 MANAGER가 아닙니다' }, { status: 403 })
    // MANAGER는 MANAGER 이상의 역할을 부여할 수 없음
    if (mbr_role_cd === 'MANAGER')
      return NextResponse.json({ error: 'MANAGER는 다른 MANAGER를 추가할 수 없습니다' }, { status: 403 })
  }

  const { error } = await supabaseAdmin
    .from('grp_mbr')
    .upsert({ grp_cd, usr_no, mbr_role_cd }, { onConflict: 'grp_cd,usr_no' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  // 구성원 제거: ADMIN/MASTER 전체, MANAGER는 자신의 그룹만
  const auth = await requireAuth(req, ['ADMIN', 'MASTER', 'MANAGER'])
  if (!auth.ok) return auth.response

  const { grp_cd, usr_no } = await req.json()

  if (auth.role_cd === 'MANAGER') {
    const owns = auth.usr_no ? await isGroupManager(auth.usr_no, grp_cd) : false
    if (!owns)
      return NextResponse.json({ error: '해당 그룹의 담당 MANAGER가 아닙니다' }, { status: 403 })
  }

  await supabaseAdmin.from('grp_mbr_perm')
    .delete().eq('grp_cd', grp_cd).eq('usr_no', usr_no)
  const { error } = await supabaseAdmin
    .from('grp_mbr').delete().eq('grp_cd', grp_cd).eq('usr_no', usr_no)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function PUT(req: NextRequest) {
  // SubManager 권한 부여/회수: ADMIN/MASTER 전체, MANAGER는 자신의 그룹만
  const auth = await requireAuth(req, ['ADMIN', 'MASTER', 'MANAGER'])
  if (!auth.ok) return auth.response

  const { grp_cd, usr_no, perm_cd, grnt_yn } = await req.json()

  if (auth.role_cd === 'MANAGER') {
    const owns = auth.usr_no ? await isGroupManager(auth.usr_no, grp_cd) : false
    if (!owns)
      return NextResponse.json({ error: '해당 그룹의 담당 MANAGER가 아닙니다' }, { status: 403 })
  }

  // 권한 부여 대상이 실제 SUBMANAGER인지 확인
  const { data: mbr } = await supabaseAdmin
    .from('grp_mbr')
    .select('mbr_role_cd')
    .eq('grp_cd', grp_cd)
    .eq('usr_no', usr_no)
    .maybeSingle()
  if (mbr?.mbr_role_cd !== 'SUBMANAGER')
    return NextResponse.json({ error: 'SUBMANAGER 구성원에게만 개별 권한을 부여할 수 있습니다' }, { status: 400 })

  if (grnt_yn === 'Y') {
    const { error } = await supabaseAdmin
      .from('grp_mbr_perm')
      .upsert({ grp_cd, usr_no, perm_cd, grnt_yn: 'Y' }, { onConflict: 'grp_cd,usr_no,perm_cd' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabaseAdmin
      .from('grp_mbr_perm')
      .delete().eq('grp_cd', grp_cd).eq('usr_no', usr_no).eq('perm_cd', perm_cd)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
