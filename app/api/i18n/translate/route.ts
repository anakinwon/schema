import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-guard'
import { revalidateTag } from 'next/cache'
import fs from 'fs/promises'
import path from 'path'

const LANG_CD_RE = /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/

// 언어 코드 → 언어 자연어명 (Claude 프롬프트용)
const LANG_NAMES: Record<string, string> = {
  en: 'English', zh: 'Simplified Chinese (简体中文)', ja: 'Japanese (日本語)',
  hi: 'Hindi (हिन्दी)', vi: 'Vietnamese (Tiếng Việt)', id: 'Indonesian (Bahasa Indonesia)',
  ms: 'Malay (Bahasa Melayu)', 'en-ZA': 'English (South Africa)',
  fil: 'Filipino (Tagalog)', th: 'Thai (ภาษาไทย)',
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

// 중첩 객체 → flat rows
function flattenNs(ns_cd: string, obj: Record<string, string>) {
  return Object.entries(obj).map(([msg_key, msg_val]) => ({ ns_cd, msg_key, msg_val }))
}

// safeLangPath: path traversal 방지
function safeLangPath(messagesDir: string, lang_cd: string): string {
  if (!LANG_CD_RE.test(lang_cd)) throw new Error(`유효하지 않은 lang_cd: ${lang_cd}`)
  const resolvedDir  = path.resolve(messagesDir)
  const resolvedFile = path.resolve(messagesDir, `${lang_cd}.json`)
  if (!resolvedFile.startsWith(resolvedDir + path.sep)) throw new Error('경로 이탈')
  return resolvedFile
}

// 섹션 하나를 Claude로 번역
async function translateSection(
  client: Anthropic,
  ns_cd: string,
  koSection: Record<string, string>,
  targetLang: string,
): Promise<Record<string, string>> {
  const langName = LANG_NAMES[targetLang] ?? targetLang

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: 'You are a professional translator. Always respond with ONLY valid JSON. No markdown, no explanation, no code blocks. Just raw JSON.',
    messages: [{
      role: 'user',
      content: `Translate these Korean UI strings to ${langName}.

STRICT RULES:
1. Output ONLY the translated JSON object — no markdown, no triple backticks, no explanation
2. Keep {placeholder} variables EXACTLY as-is: {count} {min} {maxMb} {query} {appName} {size}
3. Keep these terms unchanged: Q&A, Back Office, Admin, DA, STD_DIC, STD_DOM, Email
4. Use the same JSON keys

Korean input:
${JSON.stringify(koSection, null, 2)}`,
    }],
  })

  const raw = (message.content[0] as { type: string; text: string }).text.trim()

  // 1차: 코드 블록 제거
  let cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()

  // 2차: 중괄호로 감싸인 JSON 추출 (설명 텍스트가 붙은 경우 대비)
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error(`JSON 파싱 불가 (응답: ${raw.slice(0, 200)})`)
  cleaned = jsonMatch[0]

  return JSON.parse(cleaned)
}

// POST /api/i18n/translate  body: { lang_cd: string }
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'MASTER'])
  if (!auth.ok) return auth.response

  const { lang_cd } = await req.json()
  if (!lang_cd || !LANG_CD_RE.test(lang_cd)) {
    return NextResponse.json({ error: '유효하지 않은 lang_cd' }, { status: 400 })
  }
  if (lang_cd === 'ko') {
    return NextResponse.json({ error: '한국어는 번역 대상이 아닙니다' }, { status: 400 })
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY 환경변수가 없습니다' }, { status: 500 })
  }

  // 언어 존재 확인
  const { data: langRow } = await supabaseAdmin
    .from('i18n_lang_mst').select('lang_nm').eq('lang_cd', lang_cd).maybeSingle()
  if (!langRow) return NextResponse.json({ error: '지원하지 않는 언어' }, { status: 404 })

  // ko 번역 키 전체 조회
  const { data: koRows, error } = await supabaseAdmin
    .from('i18n_msg').select('ns_cd, msg_key, msg_val').eq('lang_cd', 'ko')
  if (error || !koRows?.length) {
    return NextResponse.json({ error: '한국어 번역 키를 찾을 수 없습니다' }, { status: 500 })
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const koByNs = toNestedByNs(koRows)
  const translated: { ns_cd: string; msg_key: string; lang_cd: string; msg_val: string }[] = []
  const sectionErrors: string[] = []

  // 섹션별 번역 (토큰 분산)
  for (const [ns_cd, koSection] of Object.entries(koByNs)) {
    try {
      const result = await translateSection(client, ns_cd, koSection, lang_cd)
      for (const row of flattenNs(ns_cd, result)) {
        translated.push({ ...row, lang_cd })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      sectionErrors.push(`[${ns_cd}] ${msg}`)
      console.error(`[translate] ${ns_cd} 섹션 실패:`, msg)
    }
  }

  if (!translated.length) {
    const detail = sectionErrors.length
      ? sectionErrors.join(' | ')
      : 'Claude API 응답 없음'
    return NextResponse.json({ error: `번역 결과가 없습니다: ${detail}` }, { status: 500 })
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

  // DB에서 해당 locale 전체 재조회 → nested 변환 (en fallback 포함)
  const [{ data: allRows }, enRaw] = await Promise.all([
    supabaseAdmin.from('i18n_msg').select('ns_cd, msg_key, msg_val').eq('lang_cd', lang_cd),
    fs.readFile(path.join(messagesDir, 'en.json'), 'utf8').then(JSON.parse).catch(() => ({})),
  ])

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

  return NextResponse.json({ ok: true, translated: translated.length, lang_cd })
}
