import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// 5분 캐싱
export const revalidate = 300

export async function GET() {
  const [{ data: countries, error }, { data: langs }] = await Promise.all([
    supabaseAdmin
      .from('i18n_cntry_mst')
      .select('country_cd, dis_ord_seq, country_eng_nm, country_mot_nm, currency_cd, currency_eng_nm, locale_cd')
      .eq('use_yn', 'Y')
      .order('dis_ord_seq', { ascending: true }),
    supabaseAdmin
      .from('i18n_lang_mst')
      .select('lang_cd')
      .eq('use_yn', 'Y'),
  ])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // i18n_lang_mst에 use_yn='Y'로 등록된 locale 목록
  const activeLangs = new Set((langs ?? []).map(l => l.lang_cd))

  const result = (countries ?? []).map(c => ({
    ...c,
    // locale_cd가 있고 i18n_lang_mst에 활성 등록된 국가만 true
    is_active: c.locale_cd ? activeLangs.has(c.locale_cd) : false,
  }))

  return NextResponse.json(result)
}
