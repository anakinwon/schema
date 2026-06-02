import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-guard'

// 국가 코드 → 언어 코드 자동 매핑 (i18n_cntry_mst.locale_cd 가 NULL인 국가용)
const COUNTRY_TO_LANG: Record<string, string> = {
  // 이미 i18n_lang_mst에 있는 11개
  KR:'ko', US:'en', CN:'zh', JP:'ja', IN:'hi', VN:'vi', ID:'id', MY:'ms', ZA:'en-ZA', PH:'fil', TH:'th',
  // 추가 가능한 주요 언어
  ES:'es', MX:'es', AR:'ar', SA:'ar', AE:'ar', EG:'ar', IQ:'ar', JO:'ar', LB:'ar', LY:'ar', MA:'ar', OM:'ar', QA:'ar', SD:'ar', SY:'ar', TN:'ar', YE:'ar',
  FR:'fr', BE:'fr', CH:'fr', CD:'fr', SN:'fr', CI:'fr', CM:'fr', MG:'fr',
  DE:'de', AT:'de',
  IT:'it',
  PT:'pt', BR:'pt', AO:'pt', MZ:'pt',
  RU:'ru', BY:'ru', KG:'ru',
  TR:'tr',
  NL:'nl',
  PL:'pl',
  SE:'sv',
  NO:'no',
  DK:'da',
  FI:'fi',
  GR:'el',
  IL:'he',
  CZ:'cs',
  HU:'hu',
  RO:'ro',
  BG:'bg',
  HR:'hr',
  SK:'sk',
  UA:'uk',
  RS:'sr',
  SI:'sl',
  LT:'lt',
  LV:'lv',
  EE:'et',
  BD:'bn',
  PK:'ur',
  LK:'si',
  NP:'ne',
  KH:'km',
  MM:'my',
  AZ:'az',
  GE:'ka',
  AM:'hy',
  KZ:'kk',
  UZ:'uz',
  MN:'mn',
  ET:'am',
  NG:'yo',
  KE:'sw', TZ:'sw', UG:'sw',
  ZW:'sn',
  GH:'ak',
  IS:'is',
  AL:'sq',
  MK:'mk',
  BA:'bs',
  ME:'cnr',
  AF:'ps',
  IR:'fa',
  NZ:'en',
  AU:'en',
  CA:'en',
  GB:'en',
  IE:'en',
  SG:'en',
  NG_EN:'en',
}

// GET: ?view=all → i18n_cntry_mst 전체 + i18n_lang_mst 조인 / 기본 → i18n_lang_mst만
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'MASTER', 'MANAGER'])
  if (!auth.ok) return auth.response

  const view = req.nextUrl.searchParams.get('view')

  if (view === 'all') {
    // 187개국 + 언어 등록 현황 조인
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
      // locale_cd 결정: DB값 → 자동매핑 순서
      const locale_cd = c.locale_cd ?? COUNTRY_TO_LANG[c.country_cd] ?? null
      const lang_mst  = locale_cd ? (langMap.get(locale_cd) ?? null) : null
      return {
        country_cd:      c.country_cd,
        dis_ord_seq:     c.dis_ord_seq,
        country_eng_nm:  c.country_eng_nm,
        country_mot_nm:  c.country_mot_nm,
        currency_cd:     c.currency_cd,
        flag_emoji:      c.flag_emoji,
        locale_cd,                    // 사용할 언어 코드
        registered:      !!lang_mst,  // i18n_lang_mst 등록 여부
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

// POST: 언어 추가 (i18n_lang_mst insert)
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
    .insert({
      lang_cd:   lang_cd.trim(),
      lang_nm:   lang_nm.trim(),
      native_nm: native_nm?.trim() ?? lang_nm.trim(),
      country_cd,
      font_key:  font_key ?? 'latin',
      dir_cd:    dir_cd ?? 'ltr',
      sort_ord:  sort_ord ?? 99,
      use_yn:    'Y',
      regr_id:   auth.email,
      modr_id:   auth.email,
    })
    .select('lang_cd')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ lang_cd: data.lang_cd }, { status: 201 })
}
