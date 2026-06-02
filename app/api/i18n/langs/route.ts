import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'MASTER', 'MANAGER'])
  if (!auth.ok) return auth.response

  const { data, error } = await supabaseAdmin
    .from('i18n_lang_mst')
    .select('lang_cd, lang_nm, native_nm, country_cd, font_key, dir_cd, sort_ord, use_yn')
    .order('sort_ord')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'MASTER'])
  if (!auth.ok) return auth.response

  const body = await req.json()
  const { lang_cd, lang_nm, native_nm, country_cd, font_key, dir_cd, sort_ord } = body

  if (!lang_cd?.trim() || !lang_nm?.trim()) {
    return NextResponse.json({ error: '언어코드·언어명은 필수입니다' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('i18n_lang_mst')
    .insert({ lang_cd: lang_cd.trim(), lang_nm: lang_nm.trim(), native_nm: native_nm?.trim() ?? lang_nm.trim(), country_cd, font_key, dir_cd: dir_cd ?? 'ltr', sort_ord: sort_ord ?? 99, regr_id: auth.email, modr_id: auth.email })
    .select('lang_cd')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ lang_cd: data.lang_cd }, { status: 201 })
}
