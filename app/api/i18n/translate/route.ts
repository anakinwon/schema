import { NextRequest, NextResponse } from 'next/server'
import { Translate } from '@google-cloud/translate/build/src/v2'
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

// 공식 Google Cloud Translation API v2 클라이언트
const translator = new Translate({ key: process.env.GOOGLE_TRANSLATE_API_KEY })

// 딜레이 헬퍼 (API 쿼터 관리용)
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

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

// {placeholder} 토큰화 → 번역 → 복원
function tokenize(value: string, tokenMap: string[]): string {
  return value.replace(/\{[^}]+\}/g, m => {
    const i = tokenMap.indexOf(m)
    if (i >= 0) return `PLHDR${i}X`
    tokenMap.push(m)
    return `PLHDR${tokenMap.length - 1}X`
  })
}
function restoreTokens(text: string, tokenMap: string[]): string {
  return text.replace(/PLHDR(\d+)X/g, (_, n) => tokenMap[+n] ?? `{${n}}`)
}

// 섹션 하나를 Google Cloud Translation API로 번역
// - 배열을 직접 전달 — 줄바꿈 구분자 방식 불필요, 분리 실패 위험 없음
async function translateSection(
  koSection: Record<string, string>,
  targetLang: string,
): Promise<Record<string, string>> {
  const to    = GOOGLE_LANG_MAP[targetLang] ?? targetLang
  const keys  = Object.keys(koSection)
  const values = Object.values(koSection)

  const tokenMap: string[] = []
  const sanitized = values.map(v => tokenize(v, tokenMap))

  // 공식 API는 문자열 배열을 직접 전달 → 키 순서가 보장된 배열로 반환
  const [translations] = await translator.translate(sanitized, { from: 'ko', to })
  const parts = Array.isArray(translations) ? translations : [translations]

  const result: Record<string, string> = {}
  keys.forEach((key, i) => {
    result[key] = restoreTokens((parts[i] ?? '').trim(), tokenMap)
  })

  return result
}

let isTranslating = false

// POST /api/i18n/translate  body: { lang_cd }
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'MASTER'])
  if (!auth.ok) return auth.response

  if (isTranslating) {
    return NextResponse.json({ error: '번역이 이미 진행 중입니다. 잠시 후 다시 시도하세요.' }, { status: 429 })
  }

  const { lang_cd } = await req.json()
  if (!lang_cd || !LANG_CD_RE.test(lang_cd))
    return NextResponse.json({ error: '유효하지 않은 lang_cd' }, { status: 400 })
  if (lang_cd === 'ko')
    return NextResponse.json({ error: '한국어는 번역 대상이 아닙니다' }, { status: 400 })

  isTranslating = true

  try {
  // ko 전체 키 + 대상 언어 기존 번역 키 동시 조회
  const [{ data: koRows, error }, { data: existingRows }] = await Promise.all([
    supabaseAdmin.from('i18n_msg').select('ns_cd, msg_key, msg_val').eq('lang_cd', 'ko'),
    supabaseAdmin.from('i18n_msg').select('ns_cd, msg_key').eq('lang_cd', lang_cd),
  ])
  if (error || !koRows?.length) {
    isTranslating = false
    return NextResponse.json({ error: '한국어 번역 키를 찾을 수 없습니다' }, { status: 500 })
  }

  // 이미 번역된 키 Set 생성
  const alreadyDone = new Set(
    (existingRows ?? []).map(r => `${r.ns_cd}:${r.msg_key}`)
  )

  // 미번역 키만 필터 (ko 전체 - 기존 번역)
  const untranslated = koRows.filter(r => !alreadyDone.has(`${r.ns_cd}:${r.msg_key}`))

  if (!untranslated.length) {
    return NextResponse.json({ ok: true, translated: 0, skipped: koRows.length, message: '이미 모두 번역되었습니다' })
  }

  const koByNs = toNestedByNs(untranslated)
  const translated: { ns_cd: string; msg_key: string; lang_cd: string; msg_val: string }[] = []
  const sectionErrors: string[] = []

  // 미번역 섹션별 번역 — 섹션 사이 쿨다운으로 Too Many Requests 방지
  const sections = Object.entries(koByNs)
  for (let si = 0; si < sections.length; si++) {
    const [ns_cd, koSection] = sections[si]
    if (si > 0) await sleep(1500)   // 섹션 간 1.5초 쿨다운
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

  try { revalidateTag('i18n', 'max') } catch (e) {
    console.error('[translate] 캐시 무효화 실패:', e)
  }

  return NextResponse.json({
    ok: true,
    translated: translated.length,
    skipped: alreadyDone.size,
    lang_cd,
    partial: sectionErrors.length > 0 ? sectionErrors : undefined,
  })
  } finally {
    isTranslating = false
  }
}
