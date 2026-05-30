import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const ALLOWED_MBR_ROLES = new Set(['MANAGER','SUBMANAGER','USER'])

export async function POST(req: NextRequest) {
  const { grp_cd, usr_no, mbr_role_cd } = await req.json()
  if (!ALLOWED_MBR_ROLES.has(mbr_role_cd))
    return NextResponse.json({ error: '허용되지 않은 구성원 역할' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('grp_mbr')
    .upsert({ grp_cd, usr_no, mbr_role_cd }, { onConflict: 'grp_cd,usr_no' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { grp_cd, usr_no } = await req.json()
  await supabaseAdmin.from('grp_mbr_perm')
    .delete().eq('grp_cd', grp_cd).eq('usr_no', usr_no)
  const { error } = await supabaseAdmin
    .from('grp_mbr').delete().eq('grp_cd', grp_cd).eq('usr_no', usr_no)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// SubManager 개별 권한 부여/회수
export async function PUT(req: NextRequest) {
  const { grp_cd, usr_no, perm_cd, grnt_yn } = await req.json()
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
