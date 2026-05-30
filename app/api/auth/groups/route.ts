import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
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
  const body = await req.json()
  const { error, data } = await supabaseAdmin
    .from('grp_mst')
    .insert({ grp_cd: body.grp_cd, grp_nm: body.grp_nm, grp_cont: body.grp_cont ?? null })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const { grp_cd } = await req.json()
  await supabaseAdmin.from('grp_mbr_perm').delete().eq('grp_cd', grp_cd)
  await supabaseAdmin.from('grp_mbr').delete().eq('grp_cd', grp_cd)
  const { error } = await supabaseAdmin.from('grp_mst').delete().eq('grp_cd', grp_cd)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
