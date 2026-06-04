// 메타 DB 복구 스크립트 (1회성)
// 배경: SQLiteDB_for_META_v5.db 가 빈 파일로 초기화되어 STD_DIC/STD_DOM/STD_WORD_COMBI 손실.
//       Supabase std_dic_sync(95)/std_dom_sync(17) 사본(6/3 동기화)에서 복원한다.
// 실행: node scripts/recover-meta-db.mjs
//
// 주의: 개발 서버가 DB를 점유 중이면 먼저 종료할 것.

import Database from 'better-sqlite3'
import { createClient } from '@supabase/supabase-js'
import path from 'node:path'
import fs from 'node:fs'

// ── .env.local 파싱 (dotenv 의존 없이 직접) ──────────────────
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local')
  const text = fs.readFileSync(envPath, 'utf8')
  const env = {}
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) env[m[1]] = m[2]
  }
  return env
}

const env = loadEnv()
const url    = env.NEXT_PUBLIC_SUPABASE_URL
const svcKey = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !svcKey) {
  console.error('❌ .env.local 에서 Supabase URL/Service Role Key 를 찾지 못했습니다.')
  process.exit(1)
}

const supabase = createClient(url, svcKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── db.ts 와 동일한 메타 DB 경로 ──────────────────────────────
const DB_PATH = path.join(
  process.cwd(),
  '.claude', 'skills', 'data-architecture-team',
  '1-chief-data-architect', 'da-common-sqlite-ops',
  'references', 'SQLiteDB_for_META_v5.db'
)

const STD_AREA = '{837B8059-C2C4-46DC-97DD-C64661CA447B}'
const END   = '99991231235959'
const ST_DT = '20240101000000' // 복원 레코드의 적용시작일 기본값

// ── 스키마 (코드베이스의 모든 STD_DIC/STD_DOM/STD_WORD_COMBI 컬럼 참조를 포괄) ──
const DDL = `
CREATE TABLE IF NOT EXISTS STD_DIC (
  STD_AREA_ID          TEXT,
  DIC_ID               TEXT PRIMARY KEY,
  AVAL_END_DT          TEXT,
  AVAL_ST_DT           TEXT,
  DIC_LOG_NM           TEXT,
  DIC_PHY_NM           TEXT,
  DIC_PHY_FLL_NM       TEXT,
  DIC_DESC             TEXT,
  ENT_CLSS_YN          TEXT,
  ATTR_CLSS_YN         TEXT,
  STANDARD_YN          TEXT,
  FORBID_YN            TEXT,
  DOM_NM_USE_YN        TEXT,
  DIC_GBN_CD           TEXT,
  TERM_GBN_CD          TEXT,
  DOM_USE_YN           TEXT,
  DOM_ID               TEXT,
  DATA_TYPE            TEXT,
  DATA_LEN             INTEGER,
  DATA_SCALE           INTEGER,
  STORED_TERM_COMP_IDS TEXT,
  SORTED_TERM_COMP_IDS TEXT,
  DEL_YN               TEXT NOT NULL DEFAULT 'N',
  DEL_DTM              TEXT
);

CREATE TABLE IF NOT EXISTS STD_DOM (
  STD_AREA_ID    TEXT,
  DOM_ID         TEXT PRIMARY KEY,
  AVAL_END_DT    TEXT,
  AVAL_ST_DT     TEXT,
  KEY_DOM_NM     TEXT,
  KEY_DOM_PHY_NM TEXT,
  DOM_NM         TEXT,
  DOM_DESC       TEXT,
  DOM_TYPE_CD    TEXT,
  DATA_TYPE_CD   TEXT,
  DATA_LEN       INTEGER,
  DATA_SCALE     INTEGER,
  DATA_FORMAT    TEXT,
  DATA_MIN       TEXT,
  DATA_MAX       TEXT,
  SECURITY_YN    TEXT,
  SECURITY_LEVEL TEXT,
  USE_END_DT     TEXT,
  USE_END_RSN    TEXT,
  OWNER_ID       TEXT,
  SRC_GBN_CD     TEXT,
  DIC_ID         TEXT,
  DEL_YN         TEXT NOT NULL DEFAULT 'N',
  DEL_DTM        TEXT
);

CREATE TABLE IF NOT EXISTS STD_WORD_COMBI (
  STD_AREA_ID TEXT,
  TERM_ID     TEXT,
  TGT_GBN_CD  TEXT,
  ORDER_NO    INTEGER,
  WORD_ID     TEXT,
  AVAL_END_DT TEXT,
  AVAL_ST_DT  TEXT,
  PRIMARY KEY (TERM_ID, TGT_GBN_CD, ORDER_NO)
);
`

async function fetchAll(table) {
  const { data, error } = await supabase.from(table).select('*')
  if (error) throw new Error(`${table} 조회 실패: ${error.message}`)
  return data ?? []
}

async function main() {
  console.log('📡 Supabase 사본 조회 중...')
  const [dicRows, domRows] = await Promise.all([
    fetchAll('std_dic_sync'),
    fetchAll('std_dom_sync'),
  ])
  console.log(`   std_dic_sync: ${dicRows.length}행, std_dom_sync: ${domRows.length}행`)

  const db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.exec(DDL)

  const insDom = db.prepare(`
    INSERT OR REPLACE INTO STD_DOM
      (STD_AREA_ID, DOM_ID, AVAL_END_DT, AVAL_ST_DT, KEY_DOM_NM, KEY_DOM_PHY_NM,
       DOM_NM, DOM_DESC, DOM_TYPE_CD, DATA_TYPE_CD, DATA_LEN, DATA_SCALE,
       SECURITY_YN, DEL_YN)
    VALUES (@STD_AREA_ID, @DOM_ID, @AVAL_END_DT, @AVAL_ST_DT, @KEY_DOM_NM, @KEY_DOM_PHY_NM,
            @DOM_NM, @DOM_DESC, @DOM_TYPE_CD, @DATA_TYPE_CD, @DATA_LEN, @DATA_SCALE,
            'N', 'N')
  `)

  const insDic = db.prepare(`
    INSERT OR REPLACE INTO STD_DIC
      (STD_AREA_ID, DIC_ID, AVAL_END_DT, AVAL_ST_DT, DIC_LOG_NM, DIC_PHY_NM,
       DIC_PHY_FLL_NM, DIC_DESC, ENT_CLSS_YN, ATTR_CLSS_YN, STANDARD_YN, FORBID_YN,
       DOM_NM_USE_YN, DIC_GBN_CD, TERM_GBN_CD, DOM_USE_YN, DOM_ID,
       DATA_TYPE, DATA_LEN, DATA_SCALE, STORED_TERM_COMP_IDS, DEL_YN)
    VALUES (@STD_AREA_ID, @DIC_ID, @AVAL_END_DT, @AVAL_ST_DT, @DIC_LOG_NM, @DIC_PHY_NM,
            @DIC_PHY_FLL_NM, @DIC_DESC, @ENT_CLSS_YN, @ATTR_CLSS_YN, 'Y', 'N',
            @DOM_NM_USE_YN, @DIC_GBN_CD, @TERM_GBN_CD, @DOM_USE_YN, @DOM_ID,
            @DATA_TYPE, @DATA_LEN, @DATA_SCALE, @STORED_TERM_COMP_IDS, 'N')
  `)

  const insCombi = db.prepare(`
    INSERT OR REPLACE INTO STD_WORD_COMBI
      (STD_AREA_ID, TERM_ID, TGT_GBN_CD, ORDER_NO, WORD_ID, AVAL_END_DT, AVAL_ST_DT)
    VALUES (?, ?, '0001', ?, ?, ?, ?)
  `)

  const run = db.transaction(() => {
    for (const r of domRows) {
      insDom.run({
        STD_AREA_ID: STD_AREA, DOM_ID: r.dom_id, AVAL_END_DT: END, AVAL_ST_DT: ST_DT,
        KEY_DOM_NM: r.key_dom_nm, KEY_DOM_PHY_NM: r.key_dom_phy_nm,
        DOM_NM: r.dom_nm, DOM_DESC: r.dom_desc ?? null,
        DOM_TYPE_CD: r.dom_type_cd ?? null, DATA_TYPE_CD: r.data_type_cd ?? null,
        DATA_LEN: r.data_len ?? null, DATA_SCALE: r.data_scale ?? null,
      })
    }

    let combiCount = 0
    for (const r of dicRows) {
      const isTerm = r.dic_gbn_cd === '0002'
      insDic.run({
        STD_AREA_ID: STD_AREA, DIC_ID: r.dic_id, AVAL_END_DT: END, AVAL_ST_DT: ST_DT,
        DIC_LOG_NM: r.dic_log_nm, DIC_PHY_NM: r.dic_phy_nm,
        DIC_PHY_FLL_NM: r.dic_phy_fll_nm ?? '', DIC_DESC: r.dic_desc ?? '',
        ENT_CLSS_YN: r.ent_clss_yn ?? 'N', ATTR_CLSS_YN: r.attr_clss_yn ?? 'Y',
        DOM_NM_USE_YN: r.dom_use_yn === 'Y' ? 'Y' : 'N',
        DIC_GBN_CD: r.dic_gbn_cd, TERM_GBN_CD: isTerm ? '0001' : null,
        DOM_USE_YN: r.dom_use_yn ?? 'N', DOM_ID: r.dom_id ?? null,
        DATA_TYPE: r.data_type ?? null, DATA_LEN: r.data_len ?? null,
        DATA_SCALE: r.data_scale ?? null,
        STORED_TERM_COMP_IDS: r.stored_term_comp_ids ?? null,
      })

      // 용어(0002)의 단어 조합을 STD_WORD_COMBI 로 재구성
      if (isTerm && r.stored_term_comp_ids) {
        const ids = String(r.stored_term_comp_ids).split(',').map(s => s.trim()).filter(Boolean)
        ids.forEach((wid, i) => {
          insCombi.run(STD_AREA, r.dic_id, i + 1, wid, END, ST_DT)
          combiCount++
        })
      }
    }
    return combiCount
  })

  const combiCount = run()

  const words = db.prepare(`SELECT COUNT(*) c FROM STD_DIC WHERE DIC_GBN_CD='0001'`).get().c
  const terms = db.prepare(`SELECT COUNT(*) c FROM STD_DIC WHERE DIC_GBN_CD='0002'`).get().c
  const doms  = db.prepare(`SELECT COUNT(*) c FROM STD_DOM`).get().c
  const combi = db.prepare(`SELECT COUNT(*) c FROM STD_WORD_COMBI`).get().c

  db.pragma('wal_checkpoint(TRUNCATE)')
  db.close()

  console.log('✅ 복구 완료')
  console.log(`   STD_DIC  : 단어 ${words} / 용어 ${terms}`)
  console.log(`   STD_DOM  : ${doms}`)
  console.log(`   STD_WORD_COMBI: ${combi} (재구성 ${combiCount})`)
}

main().catch(e => { console.error('❌ 복구 실패:', e); process.exit(1) })
