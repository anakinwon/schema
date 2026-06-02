import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// 5분 캐싱 — 187개국 목록은 거의 변경되지 않음
export const revalidate = 300

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('i18n_cntry_mst')
    .select('country_cd, dis_ord_seq, country_eng_nm, country_mot_nm, currency_cd, currency_eng_nm, locale_cd')
    .eq('use_yn', 'Y')
    .order('dis_ord_seq', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
