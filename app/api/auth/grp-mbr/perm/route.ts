import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const grp_cd = req.nextUrl.searchParams.get('grp_cd') ?? ''
  const usr_no = req.nextUrl.searchParams.get('usr_no') ?? ''
  if (!grp_cd || !usr_no)
    return NextResponse.json({ error: 'grp_cd, usr_no 필수' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('grp_mbr_perm')
    .select('perm_cd, grnt_yn')
    .eq('grp_cd', grp_cd)
    .eq('usr_no', usr_no)
    .eq('grnt_yn', 'Y')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
