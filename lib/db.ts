import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const SOURCE_DB_PATH = path.join(
  process.cwd(),
  '.claude', 'skills', 'data-architecture-team',
  '1-chief-data-architect', 'da-common-sqlite-ops',
  'references', 'SQLiteDB_for_META_v5.db'
)

// Vercel 서버리스는 프로젝트 디렉토리가 읽기 전용 — /tmp 로 복사 후 사용
function resolveDbPath(): string {
  if (process.env.VERCEL) {
    const tmpPath = '/tmp/SQLiteDB_for_META_v5.db'
    if (!fs.existsSync(tmpPath)) {
      fs.copyFileSync(SOURCE_DB_PATH, tmpPath)
    }
    return tmpPath
  }
  return SOURCE_DB_PATH
}

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(resolveDbPath())
    _db.pragma('journal_mode = WAL')
    try {
      runCodeMigration(_db)
    } catch (e) {
      console.error('[SysCode Migration] 실패:', e)
    }
    try {
      runLogicalDeleteMigration(_db)
    } catch (e) {
      console.error('[LogicalDelete Migration] 실패:', e)
    }
  }
  return _db
}

export const STD_AREA = '{837B8059-C2C4-46DC-97DD-C64661CA447B}'

// ──────────────────────────────────────────────────────────
// 논리삭제 컬럼 마이그레이션
// 대상: STD_DIC, STD_DOM
// 논리위치: 시스템컬럼(REGR_ID / REG_DTM / MODR_ID / MOD_DTM) 바로 위
// ──────────────────────────────────────────────────────────
function runLogicalDeleteMigration(db: Database.Database) {
  // 대상 테이블이 없으면(메타DB 미초기화 상태) 마이그레이션을 건너뛴다.
  // — 빈 DB에서 ALTER/UPDATE 가 'no such table' 로 전체 페이지를 크래시시키는 것을 방지.
  const hasTable = (tbl: string): boolean =>
    !!db.prepare(
      `SELECT 1 FROM sqlite_master WHERE type='table' AND name=?`
    ).get(tbl)

  const hasCol = (tbl: string, col: string): boolean =>
    (db.prepare(`PRAGMA table_info(${tbl})`).all() as { name: string }[])
      .some(c => c.name === col)

  // STD_DIC
  if (hasTable('STD_DIC')) {
    if (!hasCol('STD_DIC', 'DEL_YN'))
      db.exec("ALTER TABLE STD_DIC ADD COLUMN DEL_YN TEXT NOT NULL DEFAULT 'N'")
    if (!hasCol('STD_DIC', 'DEL_DTM'))
      db.exec('ALTER TABLE STD_DIC ADD COLUMN DEL_DTM TEXT NULL')

    // 표준단어 "일시" 약어 DTS → DTM (표준용어 통일)
    db.prepare(
      "UPDATE STD_DIC SET DIC_PHY_NM='DTM', DIC_PHY_FLL_NM='Datetime' WHERE DIC_LOG_NM='일시' AND DIC_PHY_NM='DTS'"
    ).run()
  }

  // STD_DOM
  if (hasTable('STD_DOM')) {
    if (!hasCol('STD_DOM', 'DEL_YN'))
      db.exec("ALTER TABLE STD_DOM ADD COLUMN DEL_YN TEXT NOT NULL DEFAULT 'N'")
    if (!hasCol('STD_DOM', 'DEL_DTM'))
      db.exec('ALTER TABLE STD_DOM ADD COLUMN DEL_DTM TEXT NULL')
  }
}

// ──────────────────────────────────────────────────────────
// 시스템 공통코드 관리 테이블 마이그레이션
// 주의: DA 메타DB에 STD_CODE(기존 DA 표준코드)가 이미 존재하므로
//       시스템 관리 코드는 SYS_ prefix 테이블을 별도 사용
// ──────────────────────────────────────────────────────────
function runCodeMigration(db: Database.Database) {
  // 이전 버전에서 잘못 생성된 STD_CODE_GRP → SYS_CODE_GRP 으로 rename
  const hasOldGrp = db.prepare(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='STD_CODE_GRP'`
  ).get()
  const hasNewGrp = db.prepare(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='SYS_CODE_GRP'`
  ).get()
  if (hasOldGrp && !hasNewGrp) {
    db.exec(`ALTER TABLE STD_CODE_GRP RENAME TO SYS_CODE_GRP`)
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS SYS_CODE_GRP (
      CODE_GRP_ID   TEXT NOT NULL PRIMARY KEY,
      CODE_GRP_NM   TEXT NOT NULL,
      CODE_GRP_DESC TEXT,
      USE_YN        TEXT NOT NULL DEFAULT 'Y',
      SORT_SN       INTEGER DEFAULT 0,
      REG_USR_ID    TEXT,
      REG_DT        TEXT,
      MOD_USR_ID    TEXT,
      MOD_DT        TEXT
    );

    CREATE TABLE IF NOT EXISTS SYS_CODE_VAL (
      CODE_GRP_ID   TEXT NOT NULL,
      CODE_VAL      TEXT NOT NULL,
      CODE_VAL_NM   TEXT NOT NULL,
      CODE_VAL_ENG  TEXT,
      CODE_VAL_DESC TEXT,
      USE_YN        TEXT NOT NULL DEFAULT 'Y',
      SORT_SN       INTEGER DEFAULT 0,
      REG_USR_ID    TEXT,
      REG_DT        TEXT,
      MOD_USR_ID    TEXT,
      MOD_DT        TEXT,
      PRIMARY KEY (CODE_GRP_ID, CODE_VAL)
    );
  `)
  seedInitialCodes(db)
}

const SEED_NOW = new Date().toISOString().slice(0, 19).replace('T', ' ')

const INIT_GROUPS: Array<[string, string, string, number]> = [
  ['ROLE_CD',        '사용자역할구분코드',      '시스템 사용자 역할 5계층 분류',      10],
  ['DATA_TYPE_CD',   '데이터타입구분코드',       '물리 DB 컬럼 데이터 타입 분류',      20],
  ['DOM_TYPE_CD',    '도메인유형구분코드',       '표준도메인 유형 분류(코드형/번호형/일반형)', 30],
  ['DIC_GBN_CD',    '표준단어구분코드',         '표준단어·표준용어 구분',             40],
  ['APV_STATUS_CD',  '승인상태구분코드',         '표준 변경 승인 처리 상태',           50],
  ['AUDIT_ACT_CD',   '감사이력행위구분코드',     'Audit Trail 행위 유형',             60],
  ['GRP_CD',         '사용자그룹구분코드',       '시스템 사용자 그룹 분류',            70],
]

const INIT_CODES: Array<[string, string, string, string, number]> = [
  // ROLE_CD — 사용자 역할 5계층 (DA §40: 의미 있는 코드값 사용)
  ['ROLE_CD',       'ADMIN',      '시스템관리자',    'System Administrator', 10],
  ['ROLE_CD',       'MASTER',     '데이터관리자',    'Data Master',          20],
  ['ROLE_CD',       'MANAGER',    '표준관리자',      'Standards Manager',    30],
  ['ROLE_CD',       'SUBMANAGER', '부표준관리자',    'Sub Manager',          40],
  ['ROLE_CD',       'USER',       '일반사용자',      'User',                 50],
  // DATA_TYPE_CD — 물리 DB 데이터 타입
  ['DATA_TYPE_CD',  '0003',       'VARCHAR형',       'VARCHAR',              10],
  ['DATA_TYPE_CD',  '0003T',      'TEXT형',          'TEXT',                 20],
  ['DATA_TYPE_CD',  '0013',       'INTEGER형',       'INTEGER',              30],
  ['DATA_TYPE_CD',  '0015',       'NUMERIC형',       'NUMERIC',              40],
  ['DATA_TYPE_CD',  '0018',       'DATE형',          'DATE',                 50],
  ['DATA_TYPE_CD',  '0020',       'TIMESTAMPTZ형',   'TIMESTAMPTZ',          60],
  // DOM_TYPE_CD — 도메인 유형 (DA §40: 코드형·번호형·일반형)
  ['DOM_TYPE_CD',   '0001',       '코드형',          'Code',                 10],
  ['DOM_TYPE_CD',   '0002',       '번호형',          'Number',               20],
  ['DOM_TYPE_CD',   '0003',       '일반형',          'General',              30],
  // DIC_GBN_CD — 표준단어 구분
  ['DIC_GBN_CD',   '0001',       '표준단어',        'Standard Word',        10],
  ['DIC_GBN_CD',   '0002',       '표준용어',        'Standard Term',        20],
  // APV_STATUS_CD — 승인 상태
  ['APV_STATUS_CD', 'PENDING',    '승인대기',        'Pending',              10],
  ['APV_STATUS_CD', 'APPROVED',   '승인완료',        'Approved',             20],
  ['APV_STATUS_CD', 'REJECTED',   '반려',            'Rejected',             30],
  // AUDIT_ACT_CD — 감사 이력 행위
  ['AUDIT_ACT_CD',  'INSERT',     '등록',            'Insert',               10],
  ['AUDIT_ACT_CD',  'UPDATE',     '수정',            'Update',               20],
  ['AUDIT_ACT_CD',  'DELETE',     '삭제',            'Delete',               30],
  // GRP_CD — 사용자 그룹
  ['GRP_CD',        'G_SUPER',    '슈퍼관리자그룹',  'Super Admin Group',    10],
  ['GRP_CD',        'G_MASTER',   '마스터그룹',      'Master Group',         20],
  ['GRP_CD',        'G_MANAGER',  '관리자그룹',      'Manager Group',        30],
  ['GRP_CD',        'G_SUBMAN',   '부관리자그룹',    'Sub Manager Group',    40],
  ['GRP_CD',        'G_USER',     '일반사용자그룹',  'User Group',           50],
]

function seedInitialCodes(db: Database.Database) {
  const grpExists = (db.prepare(
    `SELECT COUNT(*) as cnt FROM SYS_CODE_GRP`
  ).get() as { cnt: number }).cnt > 0
  if (grpExists) return

  const insertGrp = db.prepare(`
    INSERT OR IGNORE INTO SYS_CODE_GRP
      (CODE_GRP_ID, CODE_GRP_NM, CODE_GRP_DESC, USE_YN, SORT_SN, REG_USR_ID, REG_DT)
    VALUES (?, ?, ?, 'Y', ?, 'SYSTEM', '${SEED_NOW}')
  `)
  const insertCode = db.prepare(`
    INSERT OR IGNORE INTO SYS_CODE_VAL
      (CODE_GRP_ID, CODE_VAL, CODE_VAL_NM, CODE_VAL_ENG, USE_YN, SORT_SN, REG_USR_ID, REG_DT)
    VALUES (?, ?, ?, ?, 'Y', ?, 'SYSTEM', '${SEED_NOW}')
  `)

  const seedAll = db.transaction(() => {
    for (const [id, nm, desc, sort] of INIT_GROUPS) insertGrp.run(id, nm, desc, sort)
    for (const [grp, val, nm, eng, sort] of INIT_CODES) insertCode.run(grp, val, nm, eng, sort)
  })
  seedAll()
}
