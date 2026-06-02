import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-guard'
import { inferLocale } from '@/lib/i18n/countryLangMap'
import { getLangMeta } from '@/lib/i18n/langMeta'

// GET: ?view=all → i18n_cntry_mst 전체 + i18n_lang_mst 조인 / 기본 → i18n_lang_mst만
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'MASTER', 'MANAGER'])
  if (!auth.ok) return auth.response

  const view = req.nextUrl.searchParams.get('view')

  if (view === 'all') {
    const [{ data: countries }, { data: langs }] = await Promise.all([
      supabaseAdmin
        .from('i18n_cntry_mst')
        .select('country_cd, dis_ord_seq, country_eng_nm, country_mot_nm, currency_cd, flag_emoji, locale_cd')
        .order('dis_ord_seq'),
      supabaseAdmin
        .from('i18n_lang_mst')
        .select('lang_cd, lang_nm, native_nm, font_key, dir_cd, sort_ord, use_yn'),
    ])

    const langMap = new Map((langs ?? []).map(l => [l.lang_cd, l]))

    const result = (countries ?? []).map(c => {
      // locale_cd: DB값 우선, NULL이면 매핑 추론
      const locale_cd = c.locale_cd ?? inferLocale(c.country_cd)
      const lang_mst  = locale_cd ? (langMap.get(locale_cd) ?? null) : null
      return {
        country_cd:      c.country_cd,
        dis_ord_seq:     c.dis_ord_seq,
        country_eng_nm:  c.country_eng_nm,
        country_mot_nm:  c.country_mot_nm,
        currency_cd:     c.currency_cd,
        flag_emoji:      c.flag_emoji,
        locale_cd,
        registered:      !!lang_mst,
        use_yn:          lang_mst?.use_yn ?? null,
        lang_nm:         lang_mst?.lang_nm ?? null,
        native_nm:       lang_mst?.native_nm ?? c.country_mot_nm,
        sort_ord:        lang_mst?.sort_ord ?? 999,
      }
    })

    return NextResponse.json(result)
  }

  // 기본: i18n_lang_mst만
  const { data, error } = await supabaseAdmin
    .from('i18n_lang_mst')
    .select('lang_cd, lang_nm, native_nm, country_cd, font_key, dir_cd, sort_ord, use_yn')
    .order('sort_ord')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST: 언어 추가
// - i18n_lang_mst에 없으면 INSERT (메타데이터 자동: font_key·dir_cd·sort_ord)
// - 이미 있으면 use_yn='Y'로 재활성화 (sort_ord 등 기존값 유지)
// - i18n_cntry_mst.locale_cd 동기화 (콤보박스 활성 표시용)
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'MASTER'])
  if (!auth.ok) return auth.response

  const body = await req.json()
  const { lang_cd, lang_nm, native_nm, country_cd } = body

  if (!lang_cd?.trim() || !lang_nm?.trim()) {
    return NextResponse.json({ error: '언어코드·언어명은 필수입니다' }, { status: 400 })
  }
  const code = lang_cd.trim()

  // 1) 기존 등록 여부 확인
  const { data: existing } = await supabaseAdmin
    .from('i18n_lang_mst')
    .select('lang_cd, use_yn')
    .eq('lang_cd', code)
    .maybeSingle()

  let created = false

  if (existing) {
    // 이미 있음 → use_yn='Y' 재활성화만 (sort_ord·font_key 등 보존)
    const { error } = await supabaseAdmin
      .from('i18n_lang_mst')
      .update({ use_yn: 'Y', modr_id: auth.email })
      .eq('lang_cd', code)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    // 없음 → 신규 INSERT (메타데이터 자동 결정)
    const meta = getLangMeta(code)

    // sort_ord = 현재 최대값 + 1
    const { data: maxRow } = await supabaseAdmin
      .from('i18n_lang_mst')
      .select('sort_ord')
      .order('sort_ord', { ascending: false })
      .limit(1)
      .maybeSingle()
    const nextSort = (maxRow?.sort_ord ?? 0) + 1

    const { error } = await supabaseAdmin
      .from('i18n_lang_mst')
      .insert({
        lang_cd:   code,
        lang_nm:   lang_nm.trim(),
        native_nm: native_nm?.trim() || meta.nativeNm,
        country_cd: country_cd ?? null,
        font_key:  meta.fontKey,
        dir_cd:    meta.dir,
        sort_ord:  nextSort,
        use_yn:    'Y',
        regr_id:   auth.email,
        modr_id:   auth.email,
      })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    created = true
  }

  // 2) i18n_cntry_mst.locale_cd 동기화
  if (country_cd) {
    await supabaseAdmin
      .from('i18n_cntry_mst')
      .update({ locale_cd: code, modr_id: auth.email })
      .eq('country_cd', country_cd)
  }

  return NextResponse.json({ lang_cd: code, created }, { status: created ? 201 : 200 })
}
