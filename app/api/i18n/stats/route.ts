import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-guard'
import { inferLocale } from '@/lib/i18n/countryLangMap'
import type { NextRequest } from 'next/server'

// 번역 현황은 항상 최신 DB 값을 반환해야 함 — 캐싱 금지
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'MASTER'])
  if (!auth.ok) return auth.response

  // DB RPC로 언어별 번역 수 집계 + ko 기준 totalKeys 동시 조회
  // RPC get_i18n_msg_counts(): GROUP BY lang_cd → limit 문제 원천 차단
  const [{ data: langCountRows }, { count: totalKeys }] = await Promise.all([
    supabaseAdmin.rpc('get_i18n_msg_counts') as unknown as
      Promise<{ data: { lang_cd: string; cnt: number }[] | null }>,
    supabaseAdmin
      .from('i18n_msg')
      .select('msg_id', { count: 'exact', head: true })
      .eq('lang_cd', 'ko'),
  ])

  // RPC 결과 → 언어별 번역 수 맵
  const langStats: Record<string, number> = {}
  ;(langCountRows ?? []).forEach(r => { langStats[r.lang_cd] = Number(r.cnt) })

  // 활성 언어 목록 + 전체 국가 목록 동시 조회
  const [{ data: langs }, { data: cntryRows }] = await Promise.all([
    supabaseAdmin
      .from('i18n_lang_mst')
      .select('lang_cd, lang_nm, native_nm, sort_ord')
      .eq('use_yn', 'Y')
      .order('sort_ord'),
    supabaseAdmin
      .from('i18n_cntry_mst')
      .select('country_cd, locale_cd')
      .eq('use_yn', 'Y'),
  ])

  const activeLangSet = new Set((langs ?? []).map(l => l.lang_cd))

  // 언어별 활성 국가 목록 그룹화 (locale_cd DB값 또는 inferLocale 추론)
  const countriesByLang: Record<string, string[]> = {}
  for (const c of cntryRows ?? []) {
    const loc = c.locale_cd ?? inferLocale(c.country_cd)
    if (loc && activeLangSet.has(loc)) {
      ;(countriesByLang[loc] ??= []).push(c.country_cd)
    }
  }

  // 활성 국가 수 — 언어별 국가 목록 합계 (언어 관리 화면 "활성"과 동일 기준)
  const activeCountries = Object.values(countriesByLang).reduce((sum, arr) => sum + arr.length, 0)

  const total = totalKeys ?? 0
  const stats = (langs ?? []).map(l => {
    const translated = langStats[l.lang_cd] ?? 0
    return {
      lang_cd:   l.lang_cd,
      lang_nm:   l.lang_nm,
      native_nm: l.native_nm,
      translated,
      total,
      pct: total > 0 ? Math.round(translated / total * 100) : 0,
      countries: countriesByLang[l.lang_cd] ?? [],
    }
  })

  return NextResponse.json({
    stats,
    totalKeys: total,
    langCount: stats.length,   // 고유 언어 수
    activeCountries,           // 활성 국가 수
  })
}
