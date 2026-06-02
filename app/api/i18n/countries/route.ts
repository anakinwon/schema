import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { inferLocale } from '@/lib/i18n/countryLangMap'

// 캐시 비활성화 — 언어 활성/비활성 변경이 즉시 반영되어야 함
export const dynamic = 'force-dynamic'

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

  // i18n_lang_mst에 use_yn='Y'로 등록된 활성 언어 Set
  const activeLangs = new Set((langs ?? []).map(l => l.lang_cd))

  const result = (countries ?? []).map(c => {
    // locale_cd: DB값 우선, NULL이면 매핑 추론 (방어적)
    const locale_cd = c.locale_cd ?? inferLocale(c.country_cd)
    return {
      ...c,
      locale_cd,
      // 추론된 locale이 활성 등록된 언어일 때만 활성
      is_active: locale_cd ? activeLangs.has(locale_cd) : false,
    }
  })

  return NextResponse.json(result)
}
