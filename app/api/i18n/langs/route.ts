import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-guard'
import { inferLocale } from '@/lib/i18n/countryLangMap'

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

// POST: 언어 추가 — i18n_lang_mst upsert(활성화) + i18n_cntry_mst.locale_cd 동기화
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'MASTER'])
  if (!auth.ok) return auth.response

  const body = await req.json()
  const { lang_cd, lang_nm, native_nm, country_cd, font_key, dir_cd, sort_ord } = body

  if (!lang_cd?.trim() || !lang_nm?.trim()) {
    return NextResponse.json({ error: '언어코드·언어명은 필수입니다' }, { status: 400 })
  }
  const code = lang_cd.trim()

  // 1) i18n_lang_mst upsert — 이미 있으면 use_yn='Y'로 활성화
  const { error: langErr } = await supabaseAdmin
    .from('i18n_lang_mst')
    .upsert({
      lang_cd:   code,
      lang_nm:   lang_nm.trim(),
      native_nm: native_nm?.trim() ?? lang_nm.trim(),
      country_cd,
      font_key:  font_key ?? 'latin',
      dir_cd:    dir_cd ?? 'ltr',
      sort_ord:  sort_ord ?? 99,
      use_yn:    'Y',
      modr_id:   auth.email,
    }, { onConflict: 'lang_cd' })

  if (langErr) return NextResponse.json({ error: langErr.message }, { status: 500 })

  // 2) i18n_cntry_mst.locale_cd 동기화 — 콤보박스 활성 표시용
  if (country_cd) {
    await supabaseAdmin
      .from('i18n_cntry_mst')
      .update({ locale_cd: code, modr_id: auth.email })
      .eq('country_cd', country_cd)
  }

  return NextResponse.json({ lang_cd: code }, { status: 201 })
}
