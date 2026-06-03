# 물리DB 구축 표준준수 전파 공문

```
발신 : 데이터 품질담당자
수신 : 물리DB 구축담당자
참조 : 총괄DA
일자 : 2026-05-30
제목 : 물리DB 전환 준수사항 감리 결과 및 표준준수 이행 요청
```

---

## 1. 개요

2026-05-30 수행된 물리DB 전환 준수사항 전수 감리 결과,  
쇼핑몰 5개 테이블에서 **총 13건의 미이행 사항**이 발견되었습니다.  
총괄DA 승인(2026-05-30)을 득하여 시정 DDL을 이미 적용 완료하였으며,  
동일한 위반이 재발하지 않도록 본 전파문을 발송합니다.

---

## 2. 감리 결과 요약

| 준수사항 | 결과 | 미이행 건수 |
|---------|------|-----------|
| ① 시스템 컬럼 4종 (등록자ID/등록일시/수정자ID/수정일시) 전 테이블 필수 | **미이행** | 13건 |
| ② ~여부 컬럼 NOT NULL + DEFAULT 'Y' | **부분 미이행** | 1건 (예외 승인) |
| ③ ~날짜 컬럼 DATE 타입 | 준수 | 0건 |
| ④ PostgreSQL Object 소문자 | 준수 | 0건 |

---

## 3. 미이행 사항 상세 및 시정 내역

### 3-1. 시스템 컬럼 미이행 (13건) — 시정 완료 ✅

| 테이블 | 미이행 컬럼 | 시정 내용 |
|--------|-----------|---------|
| tb_product_category | `regr_id`, `modr_id`, `mod_dtm` | ALTER TABLE ADD COLUMN 3건 |
| tb_product | `regr_id`, `modr_id` | ALTER TABLE ADD COLUMN 2건 |
| tb_customer | `regr_id`, `mod_usr_id` | ALTER TABLE ADD COLUMN 2건 |
| tb_order | `regr_id`, `mod_usr_id` | ALTER TABLE ADD COLUMN 2건 |
| tb_order_item | `reg_dtm`, `mod_dtm`, `reg_usr_id`, `mod_usr_id` | ALTER TABLE ADD COLUMN 4건 |

**시정 DDL 마이그레이션**: `add_system_columns_compliance_fix` (2026-05-30 적용)

### 3-2. ~여부 컬럼 DEFAULT 미이행 (1건) — 총괄DA 예외 승인

| 테이블 | 컬럼 | 기준 | 현행 | 처리 결과 |
|--------|------|------|------|---------|
| tb_order_item | `ccl_yn` (취소여부) | DEFAULT `'Y'` | DEFAULT `'N'` | **총괄DA 예외 승인** — `'N'` 유지 |

**예외 승인 사유**: `ccl_yn`은 '취소 안 됨(N)이 정상 상태'인 취소여부 컬럼으로,  
DEFAULT `'Y'`(취소됨) 적용 시 신규 주문상품이 취소됨 상태로 생성되는 비즈니스 로직 충돌 발생.

---

## 4. 물리DB 구축 표준준수 필수 체크리스트

**향후 모든 테이블 생성 시 반드시 아래 체크리스트를 확인하십시오.**

### ✅ 체크리스트 A — 시스템 컬럼 4종 【v2 개정 2026-05-30】

```sql
-- ✅ 아래 순서와 속성을 반드시 준수 (총괄DA 승인 2026-05-30)
regr_id  character varying(20)  NOT NULL DEFAULT 'ADMIN',             -- ① 등록자ID
reg_dtm  timestamptz              NOT NULL DEFAULT CURRENT_TIMESTAMP,   -- ② 등록일시
modr_id  character varying(20)  NOT NULL DEFAULT 'ADMIN',             -- ③ 변경자ID
mod_dtm  timestamptz              NOT NULL DEFAULT CURRENT_TIMESTAMP,   -- ④ 변경일시
```

**상세 규칙 (v2 추가)**

| 항목 | 규칙 |
|------|------|
| 순서 | regr_id → reg_dtm → modr_id → mod_dtm (이 순서 고정) |
| NOT NULL | 4종 모두 NOT NULL 필수 |
| 최초 등록 시 | reg_dtm = mod_dtm = CURRENT_TIMESTAMP (동일값) |
| 최초 등록 시 | regr_id = modr_id = 'ADMIN' (동일값, 앱에서 실제 사용자 ID로 덮어씀) |
| 수정 시 | mod_dtm: 트리거(`fn_update_mod_dtm`) 자동 갱신 |
| 수정 시 | modr_id: 애플리케이션 레이어에서 UPDATE 시 갱신 의무 |

> ⚠️ 4개 컬럼 모두 필수. 불변(Immutable) 레코드라도 예외 없이 추가.  
> ⚠️ 반드시 비즈니스 컬럼 뒤 **맨 마지막**에 위치. 순서 변경 불가.  
> ⚠️ v1의 `DEFAULT 'SYSTEM'` / `NULL 허용`은 **폐기**. v2 기준 적용.

### ✅ 체크리스트 B — ~여부 컬럼

```sql
-- ~여부 컬럼 작성 기준
use_yn  character varying(1)  NOT NULL DEFAULT 'Y'  -- ✅ 정상
ccl_yn  character varying(1)  NOT NULL DEFAULT 'N'  -- ❌ 위반 (예외 승인 없는 한 DEFAULT 'Y' 필수)

-- 【예외 — 총괄DA 승인 없이 DEFAULT 'N' 허용】
del_yn  character varying(1)  NOT NULL DEFAULT 'N'  -- ✅ 논리삭제 여부 컬럼 전용 예외
-- 사유: "삭제 안됨(N)이 정상 상태"이므로 DEFAULT 'N'이 비즈니스 논리상 올바름.
--       체크리스트 E(논리삭제 컬럼) 규칙에 따라 사전 승인 없이 'N' 적용 가능.
```

> ⚠️ ~여부(YN) 컬럼은 NOT NULL 필수, DEFAULT `'Y'` 필수.  
> ⚠️ DEFAULT `'N'`이 필요한 경우 반드시 총괄DA 사전 승인 후 적용.  
> ⚠️ CHECK 제약 `IN ('Y', 'N')` 병행 필수.  
> ✅ **예외**: `del_yn`(삭제여부)은 DEFAULT `'N'` 전용 허용 — 체크리스트 E 참조.

### ✅ 체크리스트 C — ~날짜 컬럼

```sql
-- ~날짜(DT) 컬럼은 반드시 DATE 타입
od_dt  date  NOT NULL  -- ✅ 정상

-- 아래는 위반 (VARCHAR로 날짜 저장 금지)
od_dt  character varying(8)  -- ❌ 위반
od_dt  timestamptz              -- ❌ 위반 (일시가 아닌 날짜라면)
```

> ⚠️ 일자(DT): DATE 타입 전용  
> ⚠️ 일시(DTS): timestamptz 타입 전용  
> ⚠️ 혼용 금지

### ✅ 체크리스트 E — 논리삭제 컬럼 【신규 2026-06-03】

삭제 기능이 존재하는 모든 비즈니스 엔티티 테이블은 **반드시** 물리삭제(DELETE) 대신 논리삭제로 설계한다.

#### 컬럼 정의

```sql
-- 논리삭제 컬럼 (시스템 컬럼 4개 바로 위에 위치)
del_yn   character varying(1)  NOT NULL DEFAULT 'N',  -- 삭제여부 Y=삭제 / N=정상
del_dtm  timestamptz           NULL,                   -- 삭제일시 (논리삭제 처리 시각)

-- 시스템 컬럼 (맨 마지막, 순서 고정)
regr_id  character varying(20) NOT NULL DEFAULT 'ADMIN',
reg_dtm  timestamptz           NOT NULL DEFAULT CURRENT_TIMESTAMP,
modr_id  character varying(20) NOT NULL DEFAULT 'ADMIN',
mod_dtm  timestamptz           NOT NULL DEFAULT CURRENT_TIMESTAMP
```

#### 논리삭제 규칙

| 항목 | 규칙 |
|------|------|
| 컬럼 위치 | 시스템 컬럼 4종(`regr_id → reg_dtm → modr_id → mod_dtm`) **바로 위** |
| del_yn 기본값 | `'N'` (정상) — 체크리스트 B 예외 허용 항목 |
| del_dtm 기본값 | `NULL` (미삭제 상태) |
| CHECK 제약 | `del_yn IN ('Y', 'N')` 필수 |
| 부분 인덱스 | `CREATE INDEX ON 테이블명 (del_yn) WHERE del_yn = 'N'` 권장 |
| DELETE 문 | **사용 금지** — 모든 삭제는 UPDATE로 처리 |
| 삭제 UPDATE 패턴 | `UPDATE 테이블명 SET del_yn = 'Y', del_dtm = CURRENT_TIMESTAMP WHERE PK = :id` |
| 조회 필터 | 모든 SELECT에 `WHERE del_yn = 'N'` 필터 필수 |

#### 적용 범위

**논리삭제 필수 적용 (비즈니스 엔티티):**

```
✅ 게시글, 댓글, 첨부파일 등 사용자 생성 콘텐츠
✅ 표준단어(STD_DIC), 표준도메인(STD_DOM) 등 마스터 데이터
✅ 그룹 마스터 등 조직·구조 데이터
✅ 복구 요구가 발생할 수 있는 모든 업무 데이터
```

**물리삭제 유지 허용 (예외 케이스):**

```
❎ 권한 관계 매핑 테이블 (role_perm, grp_mbr, grp_mbr_perm 등)
   → 권한 부여/회수 자체가 삭제의 의미이므로 물리삭제가 설계 의도
❎ 이미 상태 컬럼으로 관리되는 테이블 (apv_status='CANCELLED' 등)
   → 별도 del_yn은 중복 상태 관리로 오히려 혼란 초래
❎ DELETE+INSERT 교체 패턴의 관계 테이블 (STD_WORD_COMBI 등)
   → 정렬·조합 재구성 목적의 일괄 교체, 논리삭제 불필요
❎ 보존 기간 관리용 로그 정리 테이블 (STD_AUDIT_LOG 등)
   → 의도적 보존 기간 관리, 물리삭제가 운영 설계 의도
```

> ⚠️ 삭제 기능이 있는 테이블 신규 설계 시 물리삭제 유지가 필요한 경우 총괄DA 사전 협의.  
> ⚠️ 논리삭제 적용 후 기존 조회 쿼리 전수 점검하여 `WHERE del_yn='N'` 필터 누락 여부 확인.  
> ⚠️ SQLite(DA 메타DB) 적용 시 컬럼 타입은 `TEXT NOT NULL DEFAULT 'N'` / `TEXT NULL` 사용.

---

### ✅ 체크리스트 D — 소문자

```sql
-- PostgreSQL로 물리설계 시 테이블명, 컬럼명, 인덱스명, 제약명 모두 소문자
CREATE TABLE tb_order ( ... )  -- ✅
CREATE TABLE TB_ORDER ( ... )  -- ❌ 위반
```

```sql
-- ORACLE로 물리설계 시 테이블명, 컬럼명, 인덱스명, 제약명 모두 대문자
CREATE TABLE TB_ORDER ( ... )  -- ✅
CREATE TABLE tb_order ( ... )  -- ❌ 위반
```
---

## 5. 표준단어 추가 요청 사항

시스템 컬럼 `regr_id` / `modr_id` 에 사용된 `사용자(USR)` 단어가  
현재 STD_DIC(표준단어사전)에 미등록 상태입니다.

**10-표준담당자에게 아래 표준단어 등록을 요청합니다.**

| 단어명 | 약어 | 영문명 | 역할 |
|--------|------|--------|------|
| 사용자 | USR | User | 기본어 |

---

## 6. 재발 방지 조치

1. **DDL 리뷰 절차 강화**: 테이블 생성 DDL 제출 전 본 체크리스트 자가 점검 의무화
2. **감리 주기**: 물리DB 배포 후 2영업일 이내 품질담당자 전수 감리
3. **예외 처리 절차**: DEFAULT·NULL 예외 필요 시 총괄DA 서면 승인 후 적용

---

```
이상 물리DB 구축 표준준수 전파를 완료합니다.
미이행 사항에 대한 시정은 2026-05-30 완료되었으나,
향후 신규 테이블 구축 시 본 체크리스트를 반드시 준수하여 주시기 바랍니다.

                                    데이터 품질담당자
                         총괄DA 확인 : 승인완료 (2026-05-30)
```

---

## 【추록】 시스템 컬럼 추가 규칙 전파 (v2 개정, 2026-05-30)

```
발신 : 데이터 품질담당자
수신 : 물리DB 구축담당자
참조 : 총괄DA
일자 : 2026-05-30
제목 : 시스템 컬럼 상세 규칙 추가 및 물리DB 재구축 요청
```

### 추가 규칙 요약 (총괄DA 승인 2026-05-30)

| # | 신규 추가 규칙 | 비고 |
|---|------------|------|
| 1 | 시스템 컬럼 순서 고정: `regr_id → reg_dtm → modr_id → mod_dtm` | v1 대비 순서 변경 |
| 2 | 4종 모두 NOT NULL 의무 | v1: modr_id / mod_dtm는 NULL 허용이었으나 **폐기** |
| 3 | `regr_id`, `modr_id` DEFAULT `'ADMIN'` | v1: DEFAULT 'SYSTEM' **폐기** |
| 4 | `reg_dtm`, `mod_dtm` DEFAULT `CURRENT_TIMESTAMP` (최초 등록 시 동일값) | v1과 동일 |
| 5 | 수정 시 `mod_dtm` 트리거 자동 갱신 (`fn_update_mod_dtm`) | **신규** |
| 6 | 수정 시 `modr_id` 애플리케이션 레이어 갱신 의무 | **신규** |

### 시정 내역

| 내용 | 마이그레이션 | 상태 |
|------|-----------|------|
| 5개 테이블 재생성 (CREATE→COPY→DROP→RENAME) | `rebuild_system_columns_standard_compliance` | ✅ 2026-05-30 적용 |
| 컬럼 순서 완전 준수 | 동상 | ✅ |
| 전체 NOT NULL + DEFAULT 'ADMIN'/CURRENT_TIMESTAMP | 동상 | ✅ |
| mod_dtm 자동 갱신 트리거 (`fn_update_mod_dtm`) 등록 | 동상 | ✅ |
| RLS 및 정책 재등록 | 동상 | ✅ |

### 물리DB 구축 시 필수 DDL 패턴 (최신 기준)

```sql
CREATE TABLE tb_xxx (
    -- 비즈니스 컬럼들
    col1  ...,
    col2  ...,

    -- 논리삭제 컬럼 (삭제 기능이 있는 테이블만, 시스템 컬럼 바로 위)  ← 체크리스트 E
    del_yn   character varying(1)  NOT NULL DEFAULT 'N',
    del_dtm  timestamptz           NULL,

    -- 시스템 컬럼 (맨 마지막, 순서 고정)                               ← 체크리스트 A
    regr_id  character varying(20) NOT NULL DEFAULT 'ADMIN',
    reg_dtm  timestamptz           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modr_id  character varying(20) NOT NULL DEFAULT 'ADMIN',
    mod_dtm  timestamptz           NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT ck_xxx_del_yn CHECK (del_yn IN ('Y', 'N'))              -- 체크리스트 E
);

-- mod_dtm 자동 갱신 트리거 (테이블마다 생성)
CREATE TRIGGER trg_xxx_mod_dtm
    BEFORE UPDATE ON tb_xxx
    FOR EACH ROW EXECUTE FUNCTION fn_update_mod_dtm();

-- 논리삭제 부분 인덱스 (미삭제 건 조회 성능)
CREATE INDEX idx_xxx_del_yn ON tb_xxx (del_yn) WHERE del_yn = 'N';
```

> ⚠️ `fn_update_mod_dtm()` 함수는 스키마 공통 함수로 1회만 생성, 모든 테이블에서 재사용.  
> ⚠️ `mod_usr_id`는 트리거로 처리 불가 (세션 사용자 정보 필요). **애플리케이션 UPDATE 시 반드시 SET modr_id = :currentUserId** 포함 의무.

```
이상 추가 규칙 전파를 완료합니다.
기존 테이블의 시정은 2026-05-30 완료되었습니다.
신규 테이블 구축 시 본 문서의 최신 기준을 적용하여 주시기 바랍니다.

                                    데이터 품질담당자
                         총괄DA 확인 : 승인완료 (2026-05-30)
```

---

## 【추록2】 논리삭제 설계 규칙 적용 의무화 전파 (2026-06-03)

```
발신 : 데이터 품질담당자
수신 : 물리DB 구축담당자
참조 : 총괄DA
일자 : 2026-06-03
제목 : 논리삭제 설계 규칙 적용 의무화 및 체크리스트 E 신설 전파
```

### 배경

물리삭제(DELETE)로 구현된 5개 테이블에서 데이터 복구 불가, 감사 이력 단절,
실수 삭제 시 복원 수단 부재 문제가 식별되었습니다.
총괄DA 검토 결과, 비즈니스 엔티티 테이블의 **논리삭제 설계 의무화**를 결정하고
체크리스트 E를 신설하여 본 전파문을 발송합니다.

---

### 신설 규칙 요약 (총괄DA 승인 2026-06-03)

| # | 신규 규칙 | 비고 |
|---|-----------|------|
| 1 | 비즈니스 엔티티 테이블에 `del_yn` / `del_dtm` 컬럼 필수 추가 | 체크리스트 E |
| 2 | 컬럼 위치: 시스템 컬럼 4종 **바로 위** | 추록 DDL 패턴 참조 |
| 3 | `del_yn varchar(1) NOT NULL DEFAULT 'N'` — CHECK `IN ('Y','N')` | 체크리스트 B 예외 허용 |
| 4 | `del_dtm timestamptz NULL` — 삭제 처리 시 `CURRENT_TIMESTAMP` 기록 | |
| 5 | **DELETE 문 사용 금지** — `UPDATE SET del_yn='Y', del_dtm=CURRENT_TIMESTAMP` 대체 | |
| 6 | 모든 SELECT 쿼리에 `WHERE del_yn='N'` 필터 의무 | 누락 시 삭제 데이터 노출 |
| 7 | 논리삭제 부분 인덱스 등록 권장: `WHERE del_yn='N'` | 조회 성능 최적화 |

---

### 기적용 현황 (2026-06-03 완료)

| DB | 테이블 | 컬럼 추가 | 코드 반영 |
|----|--------|----------|----------|
| Supabase | `brd_post` (게시글) | `del_yn` + `del_dtm` | DELETE → UPDATE ✅ |
| Supabase | `brd_cmnt` (댓글) | `del_yn` + `del_dtm` | DELETE → UPDATE ✅ |
| Supabase | `brd_attch` (첨부파일 DB 레코드) | `del_yn` + `del_dtm` | DELETE → UPDATE ✅ |
| SQLite | `STD_DIC` (표준단어) | `DEL_YN` + `DEL_DTM` | DELETE → UPDATE ✅ |
| SQLite | `STD_DOM` (표준도메인) | `DEL_YN` + `DEL_DTM` | DELETE → UPDATE ✅ |

> `approval_queue` 취소: `apv_status='CANCELLED'` 상태 전환으로 처리 (del_yn 별도 불필요)

**물리삭제 유지 결정 테이블 (총괄DA 확인)**

| 테이블 | 유지 근거 |
|--------|----------|
| `grp_mbr`, `grp_mbr_perm`, `role_perm` | 권한 관계 테이블 — 해제가 곧 삭제의 의미 |
| `i18n_msg` | 설정성 데이터 — 삭제·재등록 패턴 운영 |
| `STD_WORD_COMBI` | DELETE+INSERT 일괄 교체 패턴 관계 테이블 |
| `STD_AUDIT_LOG` | 보존 기간 관리용 의도적 물리 정리 |

---

### 향후 신규 테이블 설계 체크포인트

```
□ 삭제 기능 여부 검토
  → 필요: del_yn / del_dtm 추가 (체크리스트 E)
  → 불필요 또는 물리삭제 허용 케이스: 총괄DA 사전 협의

□ 컬럼 위치 확인
  → 시스템 컬럼 4종(regr_id → reg_dtm → modr_id → mod_dtm) 바로 위

□ CHECK 제약 등록
  → del_yn IN ('Y', 'N')

□ 부분 인덱스 등록
  → CREATE INDEX ON 테이블명 (del_yn) WHERE del_yn = 'N'

□ 코드 레이어 점검
  → DELETE 쿼리 → UPDATE 교체
  → SELECT 쿼리 → WHERE del_yn='N' 필터 추가
```

---

```
이상 논리삭제 설계 규칙 의무화 전파를 완료합니다.
기적용 테이블의 시정은 2026-06-03 완료되었으며,
신규 테이블 구축 시 체크리스트 E를 반드시 준수하여 주시기 바랍니다.

                                    데이터 품질담당자
                         총괄DA 확인 : 승인완료 (2026-06-03)
```
