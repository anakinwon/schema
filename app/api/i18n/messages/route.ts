import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-guard'
import { revalidateTag } from 'next/cache'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'MASTER', 'MANAGER'])
  if (!auth.ok) return auth.response

  const sp = req.nextUrl.searchParams
  const ns_cd  = sp.get('ns_cd')
  const lang_cd = sp.get('lang_cd')

  let q = supabaseAdmin.from('i18n_msg').select('msg_id, ns_cd, msg_key, lang_cd, msg_val')
  if (ns_cd)  q = q.eq('ns_cd', ns_cd)
  if (lang_cd) q = q.eq('lang_cd', lang_cd)
  q = q.order('ns_cd').order('msg_key').order('lang_cd')

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'MASTER'])
  if (!auth.ok) return auth.response

  const body = await req.json()
  const { ns_cd, msg_key, lang_cd, msg_val } = body
  if (!ns_cd || !msg_key || !lang_cd || msg_val === undefined) {
    return NextResponse.json({ error: '필수 필드 누락' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('i18n_msg')
    .upsert({ ns_cd, msg_key, lang_cd, msg_val, regr_id: auth.email, modr_id: auth.email }, { onConflict: 'ns_cd,msg_key,lang_cd' })
    .select('msg_id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  try { revalidateTag('i18n', 'max') } catch {}
  return NextResponse.json({ msg_id: data.msg_id }, { status: 201 })
}
