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
| tb_product_category | `reg_usr_id`, `mod_usr_id`, `mod_dts` | ALTER TABLE ADD COLUMN 3건 |
| tb_product | `reg_usr_id`, `mod_usr_id` | ALTER TABLE ADD COLUMN 2건 |
| tb_customer | `reg_usr_id`, `mod_usr_id` | ALTER TABLE ADD COLUMN 2건 |
| tb_order | `reg_usr_id`, `mod_usr_id` | ALTER TABLE ADD COLUMN 2건 |
| tb_order_item | `reg_dts`, `mod_dts`, `reg_usr_id`, `mod_usr_id` | ALTER TABLE ADD COLUMN 4건 |

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

### ✅ 체크리스트 A — 시스템 컬럼 4종

```sql
-- 아래 4개 컬럼을 반드시 테이블 맨 마지막에 배치할 것
reg_usr_id  character varying(20)  NOT NULL DEFAULT 'SYSTEM',  -- 등록자ID
reg_dts     timestamp              NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- 등록일시
mod_usr_id  character varying(20)  NULL,                        -- 수정자ID
mod_dts     timestamp              NULL                         -- 수정일시
```

> ⚠️ 4개 컬럼 모두 필수. 불변(Immutable) 레코드라도 예외 없이 추가.  
> ⚠️ 반드시 비즈니스 컬럼 뒤 맨 마지막에 위치.

### ✅ 체크리스트 B — ~여부 컬럼

```sql
-- ~여부 컬럼 작성 기준
use_yn  character varying(1)  NOT NULL DEFAULT 'Y'  -- ✅ 정상
ccl_yn  character varying(1)  NOT NULL DEFAULT 'N'  -- ❌ 위반 (예외 승인 없는 한 DEFAULT 'Y' 필수)
```

> ⚠️ ~여부(YN) 컬럼은 NOT NULL 필수, DEFAULT `'Y'` 필수.  
> ⚠️ DEFAULT `'N'`이 필요한 경우 반드시 총괄DA 사전 승인 후 적용.  
> ⚠️ CHECK 제약 `IN ('Y', 'N')` 병행 필수.

### ✅ 체크리스트 C — ~날짜 컬럼

```sql
-- ~날짜(DT) 컬럼은 반드시 DATE 타입
od_dt  date  NOT NULL  -- ✅ 정상

-- 아래는 위반 (VARCHAR로 날짜 저장 금지)
od_dt  character varying(8)  -- ❌ 위반
od_dt  timestamp              -- ❌ 위반 (일시가 아닌 날짜라면)
```

> ⚠️ 일자(DT): DATE 타입 전용  
> ⚠️ 일시(DTS): TIMESTAMP 타입 전용  
> ⚠️ 혼용 금지

### ✅ 체크리스트 D — 소문자

```sql
-- 테이블명, 컬럼명, 인덱스명, 제약명 모두 소문자
CREATE TABLE tb_order ( ... )  -- ✅
CREATE TABLE TB_ORDER ( ... )  -- ❌ 위반
```

---

## 5. 표준단어 추가 요청 사항

시스템 컬럼 `reg_usr_id` / `mod_usr_id` 에 사용된 `사용자(USR)` 단어가  
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
