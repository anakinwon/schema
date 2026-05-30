import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
  // 그룹 목록은 ADMIN/MASTER/MANAGER 조회 가능
  const auth = await requireAuth(req, ['ADMIN', 'MASTER', 'MANAGER'])
  if (!auth.ok) return auth.response

  const { data, error } = await supabaseAdmin
    .from('grp_mst')
    .select(`
      grp_cd, grp_nm, grp_cont, use_yn,
      grp_mbr ( usr_no, mbr_role_cd, use_yn,
        user_info ( usr_nm )
      )
    `)
    .eq('use_yn', 'Y')
    .order('grp_nm')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  // 그룹 생성은 ADMIN/MASTER만
  const auth = await requireAuth(req, ['ADMIN', 'MASTER'])
  if (!auth.ok) return auth.response

  const body = await req.json()
  if (!body.grp_cd || !body.grp_nm)
    return NextResponse.json({ error: 'grp_cd, grp_nm 필수' }, { status: 400 })

  const { error, data } = await supabaseAdmin
    .from('grp_mst')
    .insert({ grp_cd: body.grp_cd, grp_nm: body.grp_nm, grp_cont: body.grp_cont ?? null })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  // 그룹 삭제는 ADMIN/MASTER만
  const auth = await requireAuth(req, ['ADMIN', 'MASTER'])
  if (!auth.ok) return auth.response

  const { grp_cd } = await req.json()
  if (!grp_cd)
    return NextResponse.json({ error: 'grp_cd 필수' }, { status: 400 })

  await supabaseAdmin.from('grp_mbr_perm').delete().eq('grp_cd', grp_cd)
  await supabaseAdmin.from('grp_mbr').delete().eq('grp_cd', grp_cd)
  const { error } = await supabaseAdmin.from('grp_mst').delete().eq('grp_cd', grp_cd)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
