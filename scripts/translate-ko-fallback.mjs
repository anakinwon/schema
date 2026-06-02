/**
 * standards 네임스페이스 ko fallback 행 일괄 번역 스크립트
 * 실행: node --env-file=.env.local scripts/translate-ko-fallback.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { translate } from '@vitalets/google-translate-api'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

// BCP-47 → Google Translate 언어 코드
const GOOGLE_LANG_MAP = { 'en-ZA': 'en', 'fil': 'tl' }
const sleep = ms => new Promise(r => setTimeout(r, ms))

// 지수 백오프 재시도 (429 대응)
async function translateWithRetry(text, to, maxRetries = 4) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const { text: result } = await translate(text, { from: 'ko', to })
      return result
    } catch (e) {
      const is429 = String(e).includes('429') || String(e).includes('Too Many Requests')
      if (is429 && attempt < maxRetries) {
        const wait = 2000 * Math.pow(2, attempt)
        console.warn(`  429 재시도 ${attempt + 1}/${maxRetries} — ${wait}ms 대기`)
        await sleep(wait)
      } else throw e
    }
  }
}

// {placeholder} 보존 번역
function tokenize(val, map) {
  return val.replace(/\{[^}]+\}/g, m => {
    const i = map.indexOf(m)
    if (i >= 0) return `PLHDR${i}X`
    map.push(m); return `PLHDR${map.length - 1}X`
  })
}
function restore(text, map) {
  return text.replace(/PLHDR(\d+)X/g, (_, n) => map[+n] ?? `{${n}}`)
}

// 여러 값 배치 번역 (줄바꿈 구분)
async function translateBatch(koValues, to) {
  const map = []
  const sanitized = koValues.map(v => tokenize(v, map))
  const combined = sanitized.join('\n')
  const translated = await translateWithRetry(combined, to)
  const parts = translated.split('\n')

  if (parts.length === koValues.length) {
    return parts.map(p => restore(p.trim(), map))
  }
  // 줄 수 불일치 → 개별 번역 fallback
  console.warn(`  줄 수 불일치(${koValues.length}→${parts.length}) — 개별 번역`)
  const results = []
  for (const v of koValues) {
    await sleep(600)
    const tokenMap = []
    const san = tokenize(v, tokenMap)
    const t = await translateWithRetry(san, to)
    results.push(restore(t.trim(), tokenMap))
  }
  return results
}

// ── 1. ko 기준 전체 standards 키 조회 ─────────────────────────────
const { data: koRows } = await supabase
  .from('i18n_msg')
  .select('ns_cd, msg_key, msg_val')
  .eq('ns_cd', 'standards')
  .eq('lang_cd', 'ko')
  .order('msg_key')

console.log(`ko standards 키: ${koRows.length}건`)

// ── 2. 대상 언어 목록 (ko 제외) ───────────────────────────────────
const { data: langs } = await supabase
  .from('i18n_lang_mst')
  .select('lang_cd')
  .eq('use_yn', 'Y')
  .neq('lang_cd', 'ko')
  .order('lang_cd')

const koMap = Object.fromEntries(koRows.map(r => [r.msg_key, r.msg_val]))
let totalUpserted = 0

for (const { lang_cd } of langs) {
  const googleLang = GOOGLE_LANG_MAP[lang_cd] ?? lang_cd

  // 해당 언어의 standards 현재 번역 조회
  const { data: existing } = await supabase
    .from('i18n_msg')
    .select('msg_key, msg_val')
    .eq('ns_cd', 'standards')
    .eq('lang_cd', lang_cd)

  const existingMap = Object.fromEntries((existing ?? []).map(r => [r.msg_key, r.msg_val]))

  // ko fallback = ko값과 동일한 번역
  const needTranslate = koRows.filter(r => existingMap[r.msg_key] === r.msg_val)

  if (!needTranslate.length) {
    console.log(`✓ ${lang_cd}: 이미 모두 번역됨`)
    continue
  }

  console.log(`\n▶ ${lang_cd} (${googleLang}): ${needTranslate.length}건 번역 중…`)

  // 20건씩 배치 처리
  const BATCH = 20
  const upsertRows = []
  for (let i = 0; i < needTranslate.length; i += BATCH) {
    const chunk = needTranslate.slice(i, i + BATCH)
    if (i > 0) await sleep(1200)  // 배치 간 쿨다운
    try {
      const translated = await translateBatch(chunk.map(r => r.msg_val), googleLang)
      chunk.forEach((r, idx) => {
        upsertRows.push({
          ns_cd:   'standards',
          msg_key: r.msg_key,
          lang_cd,
          msg_val: translated[idx],
          regr_id: 'ADMIN',
          modr_id: 'ADMIN',
        })
      })
      process.stdout.write(`  ${Math.min(i + BATCH, needTranslate.length)}/${needTranslate.length} 완료\r`)
    } catch (e) {
      console.error(`  배치 ${i}~${i+BATCH} 실패:`, String(e).slice(0, 80))
    }
  }

  if (!upsertRows.length) { console.log(`  ⚠ ${lang_cd}: 번역 결과 없음`); continue }

  // DB upsert
  const { error } = await supabase
    .from('i18n_msg')
    .upsert(upsertRows, { onConflict: 'ns_cd,msg_key,lang_cd' })

  if (error) { console.error(`  ${lang_cd} upsert 실패:`, error.message); continue }

  totalUpserted += upsertRows.length
  console.log(`  ✓ ${lang_cd}: ${upsertRows.length}건 번역·저장 완료`)

  await sleep(1500)  // 언어 간 쿨다운
}

console.log(`\n✅ 완료: 총 ${totalUpserted}건 번역·저장`)
console.log('→ /admin/i18n/sync 버튼으로 JSON 파일을 갱신하세요.')
