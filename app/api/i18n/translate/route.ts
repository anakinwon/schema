import { NextRequest, NextResponse } from 'next/server'
import { translate } from '@vitalets/google-translate-api'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-guard'
import { revalidateTag } from 'next/cache'
import fs from 'fs/promises'
import path from 'path'

const LANG_CD_RE = /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/

// BCP-47 → Google Translate 언어 코드 매핑
const GOOGLE_LANG_MAP: Record<string, string> = {
  'en-ZA': 'en',
  'fil':   'tl',  // 필리핀어 = Tagalog
}

// safeLangPath: path traversal 방지
function safeLangPath(messagesDir: string, lang_cd: string): string {
  if (!LANG_CD_RE.test(lang_cd)) throw new Error(`유효하지 않은 lang_cd: ${lang_cd}`)
  const resolvedDir  = path.resolve(messagesDir)
  const resolvedFile = path.resolve(messagesDir, `${lang_cd}.json`)
  if (!resolvedFile.startsWith(resolvedDir + path.sep)) throw new Error('경로 이탈')
  return resolvedFile
}

// flat rows → 섹션별 중첩 객체
function toNestedByNs(rows: { ns_cd: string; msg_key: string; msg_val: string }[]) {
  const result: Record<string, Record<string, string>> = {}
  for (const r of rows) {
    if (!result[r.ns_cd]) result[r.ns_cd] = {}
    result[r.ns_cd][r.msg_key] = r.msg_val
  }
  return result
}

// 섹션 하나를 Google Translate로 번역
// - 값들을 구분자로 합쳐 한 번에 전송 (API 호출 최소화)
// - {placeholder} 토큰 보존
async function translateSection(
  koSection: Record<string, string>,
  targetLang: string,
): Promise<Record<string, string>> {
  const to = GOOGLE_LANG_MAP[targetLang] ?? targetLang
  const keys   = Object.keys(koSection)
  const values = Object.values(koSection)

  // {placeholder} → PLHDR_N 으로 임시 치환
  const tokenMap: string[] = []
  const sanitized = values.map(v =>
    v.replace(/\{[^}]+\}/g, m => {
      const i = tokenMap.indexOf(m)
      if (i >= 0) return `PLHDR${i}X`
      tokenMap.push(m)
      return `PLHDR${tokenMap.length - 1}X`
    })
  )

  // 구분자로 이어 붙여 한 번에 번역 (Google는 \n 경계를 유지)
  const SEP = ' ||| '
  const combined = sanitized.join(SEP)

  const { text } = await translate(combined, { from: 'ko', to })

  // 구분자로 분리 후 placeholder 복원
  const parts = text.split(SEP)
  const result: Record<string, string> = {}
  keys.forEach((key, i) => {
    const raw = (parts[i] ?? values[i]).trim()
    result[key] = raw.replace(/PLHDR(\d+)X/g, (_, n) => tokenMap[+n] ?? `{${n}}`)
  })
  return result
}

// POST /api/i18n/translate  body: { lang_cd }
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'MASTER'])
  if (!auth.ok) return auth.response

  const { lang_cd } = await req.json()
  if (!lang_cd || !LANG_CD_RE.test(lang_cd))
    return NextResponse.json({ error: '유효하지 않은 lang_cd' }, { status: 400 })
  if (lang_cd === 'ko')
    return NextResponse.json({ error: '한국어는 번역 대상이 아닙니다' }, { status: 400 })

  // ko 번역 키 전체 조회
  const { data: koRows, error } = await supabaseAdmin
    .from('i18n_msg').select('ns_cd, msg_key, msg_val').eq('lang_cd', 'ko')
  if (error || !koRows?.length)
    return NextResponse.json({ error: '한국어 번역 키를 찾을 수 없습니다' }, { status: 500 })

  const koByNs = toNestedByNs(koRows)
  const translated: { ns_cd: string; msg_key: string; lang_cd: string; msg_val: string }[] = []
  const sectionErrors: string[] = []

  // 섹션별 번역
  for (const [ns_cd, koSection] of Object.entries(koByNs)) {
    try {
      const result = await translateSection(koSection, lang_cd)
      for (const [msg_key, msg_val] of Object.entries(result)) {
        translated.push({ ns_cd, msg_key, lang_cd, msg_val })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      sectionErrors.push(`[${ns_cd}] ${msg}`)
      console.error(`[translate/${lang_cd}] ${ns_cd} 실패:`, msg)
    }
  }

  if (!translated.length) {
    return NextResponse.json(
      { error: `번역 결과가 없습니다: ${sectionErrors.join(' | ')}` },
      { status: 500 }
    )
  }

  // DB upsert
  const { error: upsertErr } = await supabaseAdmin
    .from('i18n_msg')
    .upsert(
      translated.map(r => ({ ...r, regr_id: auth.email, modr_id: auth.email })),
      { onConflict: 'ns_cd,msg_key,lang_cd' }
    )
  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 })

  // JSON 동기화
  const messagesDir = path.join(process.cwd(), 'messages')
  const { data: allRows } = await supabaseAdmin
    .from('i18n_msg').select('ns_cd, msg_key, msg_val').eq('lang_cd', lang_cd)

  const enRaw = await fs.readFile(path.join(messagesDir, 'en.json'), 'utf8')
    .then(JSON.parse).catch(() => ({}))

  const obj: Record<string, unknown> = { ...enRaw }
  for (const r of allRows ?? []) {
    if (!obj[r.ns_cd]) obj[r.ns_cd] = {}
    const keys = r.msg_key.split('.')
    let cur = obj[r.ns_cd] as Record<string, unknown>
    for (let i = 0; i < keys.length - 1; i++) {
      if (!cur[keys[i]]) cur[keys[i]] = {}
      cur = cur[keys[i]] as Record<string, unknown>
    }
    cur[keys[keys.length - 1]] = r.msg_val
  }

  const outPath = safeLangPath(messagesDir, lang_cd)
  await fs.writeFile(outPath, JSON.stringify(obj, null, 2), 'utf8')

  try { revalidateTag('i18n', 'max') } catch {}

  return NextResponse.json({
    ok: true,
    translated: translated.length,
    lang_cd,
    partial: sectionErrors.length > 0 ? sectionErrors : undefined,
  })
}
