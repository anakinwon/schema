/**
 * DB(i18n_msg) → messages/{locale}.json 동기화 스크립트
 * 실행: node --env-file=.env.local scripts/sync-i18n-files.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

// 활성 언어 목록
const { data: langs, error: langErr } = await supabase
  .from('i18n_lang_mst')
  .select('lang_cd')
  .eq('use_yn', 'Y')
  .order('lang_cd')

if (langErr) { console.error('언어 목록 조회 실패:', langErr.message); process.exit(1) }

// 점 표기 키 → 중첩 객체 변환 헬퍼
function setNested(obj, dotKey, value) {
  const keys = dotKey.split('.')
  let cur = obj
  for (let i = 0; i < keys.length - 1; i++) {
    if (!cur[keys[i]] || typeof cur[keys[i]] !== 'object') cur[keys[i]] = {}
    cur = cur[keys[i]]
  }
  cur[keys[keys.length - 1]] = value
}

// 언어별 개별 쿼리 (서버 max-rows 1,000 우회)
const byLang = {}
for (const { lang_cd } of langs) {
  const { data, error } = await supabase
    .from('i18n_msg')
    .select('ns_cd, msg_key, msg_val')
    .eq('lang_cd', lang_cd)
    .order('ns_cd')
    .order('msg_key')
  if (error) { console.error(`${lang_cd} 조회 실패:`, error.message); continue }
  byLang[lang_cd] = {}
  for (const { ns_cd, msg_key, msg_val } of data) {
    setNested(byLang[lang_cd], `${ns_cd}.${msg_key}`, msg_val)
  }
}

// 언어별 파일 쓰기
const messagesDir = join(ROOT, 'messages')
const synced = {}

for (const { lang_cd } of langs) {
  if (!byLang[lang_cd]) { console.warn(`⚠  ${lang_cd}: DB 데이터 없음`); continue }

  const outPath = join(messagesDir, `${lang_cd}.json`)
  const cnt = Object.values(byLang[lang_cd]).reduce(function count(acc, v) {
    return typeof v === 'object' ? acc + Object.values(v).reduce(count, 0) : acc + 1
  }, 0)
  writeFileSync(outPath, JSON.stringify(byLang[lang_cd], null, 2), 'utf8')
  synced[lang_cd] = cnt
  console.log(`✓  ${lang_cd}.json  ${cnt}건`)
}

console.log(`\n완료: ${Object.keys(synced).length}개 언어 파일 재생성`)
