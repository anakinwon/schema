import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-guard'
import { revalidateTag } from 'next/cache'
import fs from 'fs/promises'
import path from 'path'

// BCP-47 형식 검증 — path traversal 방지
// 허용: ko, en, zh, ja, hi, vi, id, ms, en-ZA, fil, th 등
const LANG_CD_RE = /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/

function safeLangPath(messagesDir: string, lang_cd: string): string {
  if (!LANG_CD_RE.test(lang_cd)) throw new Error(`유효하지 않은 lang_cd: ${lang_cd}`)

  const resolvedDir  = path.resolve(messagesDir)
  const resolvedFile = path.resolve(messagesDir, `${lang_cd}.json`)

  // 최종 경로가 messagesDir 하위인지 확인 (path traversal 방지)
  if (!resolvedFile.startsWith(resolvedDir + path.sep)) {
    throw new Error(`경로 이탈 시도: ${lang_cd}`)
  }
  return resolvedFile
}

// DB → messages/{locale}.json 동기화 (전체 또는 단일 언어)
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'MASTER'])
  if (!auth.ok) return auth.response

  // body의 lang_cd 가 있으면 해당 언어만, 없으면 전체
  const body = await req.json().catch(() => ({}))
  const targetLang = body?.lang_cd as string | undefined

  const query = supabaseAdmin.from('i18n_lang_mst').select('lang_cd').eq('use_yn', 'Y')
  const { data: langs } = targetLang
    ? await query.eq('lang_cd', targetLang)
    : await query

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
    // 경로 검증 — 유효하지 않으면 해당 언어만 건너뜀
    let outPath: string
    try {
      outPath = safeLangPath(messagesDir, lang_cd)
    } catch (e) {
      console.error('[i18n/sync] 경로 검증 실패:', e)
      continue
    }

    const langRows = (rows ?? []).filter(r => r.lang_cd === lang_cd)
    // flat rows → nested object (ns_cd + 점 표기 msg_key)
    const obj: Record<string, unknown> = {}
    for (const r of langRows) {
      if (!obj[r.ns_cd]) obj[r.ns_cd] = {}
      const keys = r.msg_key.split('.')
      let cur = obj[r.ns_cd] as Record<string, unknown>
      for (let i = 0; i < keys.length - 1; i++) {
        if (!cur[keys[i]]) cur[keys[i]] = {}
        cur = cur[keys[i]] as Record<string, unknown>
      }
      cur[keys[keys.length - 1]] = r.msg_val
    }

    await fs.writeFile(outPath, JSON.stringify(obj, null, 2), 'utf8')
    results[lang_cd] = langRows.length
  }

  revalidateTag('i18n', 'max')
  return NextResponse.json({ ok: true, synced: results })
}
