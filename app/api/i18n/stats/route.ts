import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-guard'
import type { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'MASTER'])
  if (!auth.ok) return auth.response

  // ko 기준 전체 키 수
  const { count: totalKeys } = await supabaseAdmin
    .from('i18n_msg')
    .select('msg_id', { count: 'exact', head: true })
    .eq('lang_cd', 'ko')

  // 언어별 번역 수
  const { data: langStats } = await supabaseAdmin
    .from('i18n_msg')
    .select('lang_cd')
    .then(async ({ data }) => {
      const counts: Record<string, number> = {}
      ;(data ?? []).forEach(r => { counts[r.lang_cd] = (counts[r.lang_cd] ?? 0) + 1 })
      return { data: counts }
    })

  // 활성 언어 목록
  const { data: langs } = await supabaseAdmin
    .from('i18n_lang_mst')
    .select('lang_cd, lang_nm, native_nm, sort_ord')
    .eq('use_yn', 'Y')
    .order('sort_ord')

  const total = totalKeys ?? 0
  const stats = (langs ?? []).map(l => ({
    lang_cd:    l.lang_cd,
    lang_nm:    l.lang_nm,
    native_nm:  l.native_nm,
    translated: (langStats as Record<string, number>)?.[l.lang_cd] ?? 0,
    total,
    pct: total > 0 ? Math.round(((langStats as Record<string, number>)?.[l.lang_cd] ?? 0) / total * 100) : 0,
  }))

  return NextResponse.json({ stats, totalKeys: total })
}
