import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-guard'
import { revalidateTag } from 'next/cache'
import fs from 'fs/promises'
import path from 'path'

// DB → messages/{locale}.json 동기화
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'MASTER'])
  if (!auth.ok) return auth.response

  // 활성 언어 목록
  const { data: langs } = await supabaseAdmin
    .from('i18n_lang_mst')
    .select('lang_cd')
    .eq('use_yn', 'Y')

  if (!langs?.length) return NextResponse.json({ error: '활성 언어 없음' }, { status: 400 })

  // 전체 번역 메시지 조회
  const { data: rows, error } = await supabaseAdmin
    .from('i18n_msg')
    .select('ns_cd, msg_key, lang_cd, msg_val')
    .order('ns_cd').order('msg_key')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results: Record<string, number> = {}
  const messagesDir = path.join(process.cwd(), 'messages')

  for (const { lang_cd } of langs) {
    const langRows = (rows ?? []).filter(r => r.lang_cd === lang_cd)
    // flat rows → nested object (ns_cd + 점 표기 msg_key)
    const obj: Record<string, unknown> = {}
    for (const r of langRows) {
      const nsKey = r.ns_cd
      if (!obj[nsKey]) obj[nsKey] = {}
      // 점 표기 키를 nested 객체로 변환
      const keys = r.msg_key.split('.')
      let cur = obj[nsKey] as Record<string, unknown>
      for (let i = 0; i < keys.length - 1; i++) {
        if (!cur[keys[i]]) cur[keys[i]] = {}
        cur = cur[keys[i]] as Record<string, unknown>
      }
      cur[keys[keys.length - 1]] = r.msg_val
    }
    await fs.writeFile(
      path.join(messagesDir, `${lang_cd}.json`),
      JSON.stringify(obj, null, 2),
      'utf8'
    )
    results[lang_cd] = langRows.length
  }

  revalidateTag('i18n', 'max')
  return NextResponse.json({ ok: true, synced: results })
}
