-- ============================================================
-- 파일명  : 06_logical_delete_migration.sql
-- 목적    : 물리삭제 → 논리삭제 전환 마이그레이션
-- 적용일  : 2026-06-03
-- 대상 DB : Supabase(PostgreSQL) + SQLite DA 메타DB
-- ============================================================
-- 논리위치 규칙: 삭제 컬럼(del_yn, del_dtm)은
--   시스템 컬럼 4개(reg_usr_id / reg_dtm / mod_usr_id / mod_dtm) 바로 위에 위치
--   PostgreSQL은 물리적 위치 지정 불가 → COMMENT로 논리 위치 명시
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- [Supabase / PostgreSQL]
-- 대상 테이블: brd_post, brd_cmnt, brd_attch
-- ────────────────────────────────────────────────────────────

-- ① brd_post (게시글) — 논리위치: acpt_cmnt_id 다음, reg_usr_id 위
ALTER TABLE brd_post
  ADD COLUMN IF NOT EXISTS del_yn  character varying(1) NOT NULL DEFAULT 'N',
  ADD COLUMN IF NOT EXISTS del_dtm timestamptz          NULL;
ALTER TABLE brd_post
  ADD CONSTRAINT ck_brd_post_del_yn CHECK (del_yn IN ('Y','N'));
COMMENT ON COLUMN brd_post.del_yn  IS '삭제여부 Y/N — 논리위치: reg_usr_id 위';
COMMENT ON COLUMN brd_post.del_dtm IS '삭제일시 — 논리삭제 처리 시각';
CREATE INDEX IF NOT EXISTS idx_brd_post_del_yn  ON brd_post  (del_yn) WHERE del_yn = 'N';

-- ② brd_cmnt (댓글) — 논리위치: acpt_yn 다음, reg_usr_id 위
ALTER TABLE brd_cmnt
  ADD COLUMN IF NOT EXISTS del_yn  character varying(1) NOT NULL DEFAULT 'N',
  ADD COLUMN IF NOT EXISTS del_dtm timestamptz          NULL;
ALTER TABLE brd_cmnt
  ADD CONSTRAINT ck_brd_cmnt_del_yn CHECK (del_yn IN ('Y','N'));
COMMENT ON COLUMN brd_cmnt.del_yn  IS '삭제여부 Y/N — 논리위치: reg_usr_id 위';
COMMENT ON COLUMN brd_cmnt.del_dtm IS '삭제일시';
CREATE INDEX IF NOT EXISTS idx_brd_cmnt_del_yn  ON brd_cmnt  (del_yn) WHERE del_yn = 'N';

-- ③ brd_attch (첨부파일 DB 레코드 — Storage 파일은 물리삭제 유지)
--    논리위치: fl_tp 다음, reg_usr_id 위
ALTER TABLE brd_attch
  ADD COLUMN IF NOT EXISTS del_yn  character varying(1) NOT NULL DEFAULT 'N',
  ADD COLUMN IF NOT EXISTS del_dtm timestamptz          NULL;
ALTER TABLE brd_attch
  ADD CONSTRAINT ck_brd_attch_del_yn CHECK (del_yn IN ('Y','N'));
COMMENT ON COLUMN brd_attch.del_yn  IS '삭제여부 Y/N — 논리위치: reg_usr_id 위. Storage 파일은 물리삭제 유지';
COMMENT ON COLUMN brd_attch.del_dtm IS '삭제일시';
CREATE INDEX IF NOT EXISTS idx_brd_attch_del_yn ON brd_attch (del_yn) WHERE del_yn = 'N';

-- ────────────────────────────────────────────────────────────
-- [SQLite / DA 메타DB] — lib/db.ts runLogicalDeleteMigration() 자동 적용
-- 대상 테이블: STD_DIC, STD_DOM
-- ────────────────────────────────────────────────────────────
-- 아래는 참조용 DDL (실제 적용은 Node.js 마이그레이션 코드에서 수행)

-- STD_DIC — 논리위치: 시스템컬럼(REGR_ID / REG_DTM / MODR_ID / MOD_DTM) 바로 위
ALTER TABLE STD_DIC ADD COLUMN DEL_YN  TEXT NOT NULL DEFAULT 'N';
ALTER TABLE STD_DIC ADD COLUMN DEL_DTM TEXT NULL;   -- ISO 8601 'YYYY-MM-DD HH:MM:SS'

-- STD_DOM
ALTER TABLE STD_DOM ADD COLUMN DEL_YN  TEXT NOT NULL DEFAULT 'N';
ALTER TABLE STD_DOM ADD COLUMN DEL_DTM TEXT NULL;

-- ────────────────────────────────────────────────────────────
-- 물리삭제 유지 결정 테이블 (논리삭제 미적용 근거)
-- ────────────────────────────────────────────────────────────
-- grp_mbr        : 그룹 멤버십 관계 테이블 — 해제가 곧 삭제
-- grp_mbr_perm   : 그룹 권한 관계 테이블 — 동상
-- role_perm      : 역할-권한 매핑 — 동상
-- approval_queue : apv_status 컬럼으로 상태 관리 (CANCELLED 값 사용)
-- i18n_msg       : 설정성 데이터 — 삭제·재등록 패턴
-- STD_WORD_COMBI : DELETE+INSERT 교체 패턴의 관계 테이블
-- STD_AUDIT_LOG  : 보존 기간 관리용 의도적 물리 정리

-- ────────────────────────────────────────────────────────────
-- 향후 테이블 설계 표준 (논리삭제 컬럼 추가 위치)
-- ────────────────────────────────────────────────────────────
-- 비즈니스 엔티티 테이블 신규 설계 시 아래 순서로 컬럼 배치:
--
--   [업무 컬럼들]
--   del_yn   varchar(1)  NOT NULL DEFAULT 'N'   -- 삭제여부 ← 시스템컬럼 바로 위
--   del_dtm  timestamptz NULL                   -- 삭제일시
--   reg_usr_id varchar(20) NOT NULL DEFAULT ... -- 시스템컬럼 ①
--   reg_dtm    timestamptz NOT NULL DEFAULT ... -- 시스템컬럼 ②
--   mod_usr_id varchar(20) NOT NULL DEFAULT ... -- 시스템컬럼 ③
--   mod_dtm    timestamptz NOT NULL DEFAULT ... -- 시스템컬럼 ④
--
-- CHECK 제약조건: del_yn IN ('Y','N')
-- 부분 인덱스   : CREATE INDEX ON 테이블명 (del_yn) WHERE del_yn = 'N'
