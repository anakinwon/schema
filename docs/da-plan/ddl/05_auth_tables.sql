-- ============================================================
-- 권한관리 시스템 DDL
-- 역할계층: ADMIN(1) > MASTER(2) > MANAGER(3) > SUBMANAGER(4) > USER(5)
-- ============================================================

-- 1. 역할 마스터 (role_mst)
CREATE TABLE IF NOT EXISTS role_mst (
    role_cd              character varying(20)  NOT NULL,
    role_nm              character varying(50)  NOT NULL,
    role_lvl             integer                NOT NULL,
    role_cont            text                   NULL,
    use_yn               character varying(1)   NOT NULL DEFAULT 'Y',
    regr_id              character varying(50)  NOT NULL DEFAULT 'ADMIN',
    reg_dtm              timestamp              NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modr_id              character varying(50)  NOT NULL DEFAULT 'ADMIN',
    mod_dtm              timestamp              NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_role_mst PRIMARY KEY (role_cd)
);

-- 2. 권한 마스터 (perm_mst)
CREATE TABLE IF NOT EXISTS perm_mst (
    perm_cd              character varying(50)  NOT NULL,
    perm_nm              character varying(100) NOT NULL,
    perm_cat_cd          character varying(20)  NULL,
    perm_cont            text                   NULL,
    use_yn               character varying(1)   NOT NULL DEFAULT 'Y',
    regr_id              character varying(50)  NOT NULL DEFAULT 'ADMIN',
    reg_dtm              timestamp              NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modr_id              character varying(50)  NOT NULL DEFAULT 'ADMIN',
    mod_dtm              timestamp              NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_perm_mst PRIMARY KEY (perm_cd)
);

-- 3. 역할-권한 매핑 (role_perm)
CREATE TABLE IF NOT EXISTS role_perm (
    role_cd              character varying(20)  NOT NULL,
    perm_cd              character varying(50)  NOT NULL,
    grnt_yn              character varying(1)   NOT NULL DEFAULT 'Y',
    regr_id              character varying(50)  NOT NULL DEFAULT 'ADMIN',
    reg_dtm              timestamp              NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modr_id              character varying(50)  NOT NULL DEFAULT 'ADMIN',
    mod_dtm              timestamp              NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_role_perm PRIMARY KEY (role_cd, perm_cd)
);

-- 4. 그룹 마스터 (grp_mst)
CREATE TABLE IF NOT EXISTS grp_mst (
    grp_cd               character varying(20)  NOT NULL,
    grp_nm               character varying(100) NOT NULL,
    grp_cont             text                   NULL,
    use_yn               character varying(1)   NOT NULL DEFAULT 'Y',
    regr_id              character varying(50)  NOT NULL DEFAULT 'ADMIN',
    reg_dtm              timestamp              NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modr_id              character varying(50)  NOT NULL DEFAULT 'ADMIN',
    mod_dtm              timestamp              NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_grp_mst PRIMARY KEY (grp_cd)
);

-- 5. 그룹 구성원 (grp_mbr)
CREATE TABLE IF NOT EXISTS grp_mbr (
    grp_cd               character varying(20)  NOT NULL,
    usr_no               character varying(10)  NOT NULL,
    mbr_role_cd          character varying(20)  NOT NULL DEFAULT 'USER',
    use_yn               character varying(1)   NOT NULL DEFAULT 'Y',
    regr_id              character varying(50)  NOT NULL DEFAULT 'ADMIN',
    reg_dtm              timestamp              NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modr_id              character varying(50)  NOT NULL DEFAULT 'ADMIN',
    mod_dtm              timestamp              NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_grp_mbr PRIMARY KEY (grp_cd, usr_no)
);

-- 6. 그룹 구성원 개별 권한 (grp_mbr_perm) — SubManager 전용
CREATE TABLE IF NOT EXISTS grp_mbr_perm (
    grp_cd               character varying(20)  NOT NULL,
    usr_no               character varying(10)  NOT NULL,
    perm_cd              character varying(50)  NOT NULL,
    grnt_yn              character varying(1)   NOT NULL DEFAULT 'Y',
    regr_id              character varying(50)  NOT NULL DEFAULT 'ADMIN',
    reg_dtm              timestamp              NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modr_id              character varying(50)  NOT NULL DEFAULT 'ADMIN',
    mod_dtm              timestamp              NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_grp_mbr_perm PRIMARY KEY (grp_cd, usr_no, perm_cd)
);

-- 7. user_info에 role_cd 추가
ALTER TABLE user_info ADD COLUMN IF NOT EXISTS role_cd character varying(20) DEFAULT 'USER';

-- ============================================================
-- 초기 데이터
-- ============================================================

-- 역할 마스터
INSERT INTO role_mst (role_cd, role_nm, role_lvl, role_cont) VALUES
  ('ADMIN',      '수퍼관리자', 1, '모든 권한 소유. 시스템 전체 관리. 단 1명만 존재.'),
  ('MASTER',     '마스터',     2, '권한 부여 가능한 관리자. 최대 2명까지 지정 가능.'),
  ('MANAGER',    '매니저',     3, '특정 모임/그룹의 권한자. 그룹 내 권한 부여 가능.'),
  ('SUBMANAGER', '부매니저',   4, '매니저가 부여한 일부 권한을 보유하는 사용자.'),
  ('USER',       '일반사용자', 5, '기본 조회 권한만 보유하는 일반 사용자.')
ON CONFLICT (role_cd) DO NOTHING;

-- 권한 마스터
INSERT INTO perm_mst (perm_cd, perm_nm, perm_cat_cd, perm_cont) VALUES
  ('STD_WORD_R',  '표준단어 조회',       'STD_WORD',  '표준단어 목록 및 상세 조회'),
  ('STD_WORD_W',  '표준단어 등록/수정',  'STD_WORD',  '표준단어 신규 등록 및 수정'),
  ('STD_WORD_D',  '표준단어 삭제',       'STD_WORD',  '표준단어 삭제 (주의: 복구 불가)'),
  ('STD_DOM_R',   '표준도메인 조회',     'STD_DOM',   '표준도메인 목록 및 상세 조회'),
  ('STD_DOM_W',   '표준도메인 등록/수정','STD_DOM',   '표준도메인 신규 등록 및 수정'),
  ('STD_DOM_D',   '표준도메인 삭제',     'STD_DOM',   '표준도메인 삭제'),
  ('STD_TERM_R',  '표준용어 조회',       'STD_TERM',  '표준용어 목록 및 상세 조회'),
  ('STD_TERM_W',  '표준용어 등록/수정',  'STD_TERM',  '표준용어 신규 등록 및 수정'),
  ('STD_TERM_D',  '표준용어 삭제',       'STD_TERM',  '표준용어 삭제'),
  ('STD_APRV',    '표준 최종승인',       'STD_MGMT',  'DA 리더 최종 승인 권한'),
  ('USR_MGMT',    '사용자 관리',         'SYS_MGMT',  '사용자 역할 부여/회수'),
  ('GRP_MGMT',    '그룹 관리',           'SYS_MGMT',  '그룹 생성/수정/삭제 및 구성원 관리'),
  ('PERM_GRANT',  '권한 부여',           'SYS_MGMT',  'SubManager에게 권한 부여/회수')
ON CONFLICT (perm_cd) DO NOTHING;

-- 역할-권한 매핑
-- ADMIN: 전체 권한
INSERT INTO role_perm (role_cd, perm_cd)
  SELECT 'ADMIN', perm_cd FROM perm_mst
  ON CONFLICT DO NOTHING;

-- MASTER: 모든 표준 권한 + 관리 권한
INSERT INTO role_perm (role_cd, perm_cd) VALUES
  ('MASTER','STD_WORD_R'),('MASTER','STD_WORD_W'),('MASTER','STD_WORD_D'),
  ('MASTER','STD_DOM_R'), ('MASTER','STD_DOM_W'), ('MASTER','STD_DOM_D'),
  ('MASTER','STD_TERM_R'),('MASTER','STD_TERM_W'),('MASTER','STD_TERM_D'),
  ('MASTER','STD_APRV'),  ('MASTER','USR_MGMT'),  ('MASTER','GRP_MGMT'),
  ('MASTER','PERM_GRANT')
ON CONFLICT DO NOTHING;

-- MANAGER: 표준 조회+쓰기 + 그룹/권한 관리
INSERT INTO role_perm (role_cd, perm_cd) VALUES
  ('MANAGER','STD_WORD_R'),('MANAGER','STD_WORD_W'),
  ('MANAGER','STD_DOM_R'), ('MANAGER','STD_DOM_W'),
  ('MANAGER','STD_TERM_R'),('MANAGER','STD_TERM_W'),
  ('MANAGER','GRP_MGMT'),  ('MANAGER','PERM_GRANT')
ON CONFLICT DO NOTHING;

-- SUBMANAGER: 기본 조회만 (추가 권한은 grp_mbr_perm으로 관리)
INSERT INTO role_perm (role_cd, perm_cd) VALUES
  ('SUBMANAGER','STD_WORD_R'),
  ('SUBMANAGER','STD_DOM_R'),
  ('SUBMANAGER','STD_TERM_R')
ON CONFLICT DO NOTHING;

-- USER: 조회만
INSERT INTO role_perm (role_cd, perm_cd) VALUES
  ('USER','STD_WORD_R'),
  ('USER','STD_DOM_R'),
  ('USER','STD_TERM_R')
ON CONFLICT DO NOTHING;
