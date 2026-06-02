/**
 * DB에 없는 standards 번역 키를 이전 messages 파일에서 읽어 일괄 삽입합니다.
 * 실행: node --env-file=.env.local scripts/seed-missing-i18n.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

// ── 1. DB에 현재 있는 키 조회 ────────────────────────────────────────
const { data: existing } = await supabase
  .from('i18n_msg')
  .select('ns_cd, msg_key, lang_cd')

const dbKeys = new Set(existing.map(r => `${r.ns_cd}::${r.msg_key}::${r.lang_cd}`))
console.log(`DB 기존 키: ${existing.length}건`)

// ── 2. 평탄화 헬퍼 ───────────────────────────────────────────────────
function flatten(obj, prefix = '') {
  const res = {}
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(res, flatten(v, key))
    } else {
      res[key] = String(v ?? '')
    }
  }
  return res
}

// ── 3. 언어별 이전 파일에서 standards 네임스페이스 읽기 ──────────────
const langs = ['ko','en','zh','ja','hi','vi','id','ms','en-ZA','fil','th','de','sq','ps']
const langData = {}   // lang_cd → flat standards keys
const koFlat = {}     // ko 기준 (다른 언어에 값 없을 때 fallback)

for (const lang of langs) {
  try {
    const raw = readFileSync(join(__dirname, `prev_${lang}.json`), 'utf8')
    const json = JSON.parse(raw)
    const flat = flatten(json.standards ?? {})
    langData[lang] = flat
    if (lang === 'ko') Object.assign(koFlat, flat)
  } catch {
    console.warn(`⚠ prev_${lang}.json 없음 — 건너뜀`)
  }
}

// ── 4. 누락 키 수집 ──────────────────────────────────────────────────
const rows = []
// ko 기준으로 전체 키 목록 파악
for (const [msgKey, koVal] of Object.entries(koFlat)) {
  for (const lang of langs) {
    if (!langData[lang]) continue
    const dbKey = `standards::${msgKey}::${lang}`
    if (dbKeys.has(dbKey)) continue   // 이미 있는 키 건너뜀

    const val = langData[lang][msgKey] ?? koVal  // 해당 언어 값, 없으면 ko 값
    rows.push({
      ns_cd:    'standards',
      msg_key:  msgKey,
      lang_cd:  lang,
      msg_val:  val,
      regr_id:  'ADMIN',
      modr_id:  'ADMIN',
    })
  }
}

console.log(`삽입 대상: ${rows.length}건 (${langs.length}개 언어 × 누락 키)`)

if (rows.length === 0) {
  console.log('✅ 누락 키 없음 — 완료')
  process.exit(0)
}

// ── 5. 배치 삽입 (100건 단위) ────────────────────────────────────────
const BATCH = 100
let inserted = 0
for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH)
  const { error } = await supabase.from('i18n_msg').insert(batch)
  if (error) {
    console.error(`배치 ${i}~${i + batch.length} 실패:`, error.message)
  } else {
    inserted += batch.length
    process.stdout.write(`  ${inserted}/${rows.length} 삽입됨\r`)
  }
}

console.log(`\n✅ 완료: ${inserted}건 삽입`)

// ── 6. 언어별 결과 요약 ──────────────────────────────────────────────
const byLang = {}
for (const r of rows) {
  byLang[r.lang_cd] = (byLang[r.lang_cd] ?? 0) + 1
}
console.log('\n언어별 삽입 건수:')
for (const [lang, cnt] of Object.entries(byLang).sort()) {
  console.log(`  ${lang}: +${cnt}건`)
}
