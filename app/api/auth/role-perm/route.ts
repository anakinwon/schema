import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('role_perm')
    .select('role_cd, perm_cd, grnt_yn')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  const { role_cd, perm_cd, grnt_yn } = await req.json()

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
