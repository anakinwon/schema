# 40. 데이터 이관 담당자 업무계획

## ① 역할 정의

> **데이터 이관 담당자**: 소스 시스템의 데이터를 타겟 시스템으로 안전하게 이전하기 위해, 샘플 데이터 수집·생성, 개인정보 익명화, 소스-타겟 컬럼 매핑 설계, ETL 스크립트 작성, 이관 후 검증까지 전 과정을 책임지는 사람이다.

이관 담당자는 아래 네 가지 전문 역할 에이전트를 통해 수행된다.

| 에이전트 | 파일 | 담당 업무 |
|----------|------|-----------|
| da-mig-sample-generator | `.claude/agents/da/40-migration/da-mig-sample-generator.md` | 샘플 데이터 수집 및 생성 (`gen_sample.py`) |
| da-mig-mapping-designer | `.claude/agents/da/40-migration/da-mig-mapping-designer.md` | 소스-타겟 컬럼 매핑 설계 |
| da-mig-etl-scripter | `.claude/agents/da/40-migration/da-mig-etl-scripter.md` | ETL 변환 스크립트 개발 |
| da-mig-validator | `.claude/agents/da/40-migration/da-mig-validator.md` | 이관 검증 (건수·값·무결성) |

---

## ② 참고한 지침서 및 근거

### 2-1. DA#5 SQLite 메타 DB 기반 이관 체계

**지원 DBMS 범위** (`DA_CODE` 테이블, `UP_CD_ID='0001'`에서 추출):

이관 소스·타겟으로 지원 가능한 DBMS는 총 29종으로 확인된다.

```
0001: ORACLE       0006: MS SQL SERVER   0011: MYSQL        0014: PostgreSQL
0017: GREENPLUM    0018: NETEZZA         0023: IMPALA       0015: HIVE
0022: REDSHIFT     0028: BIGQUERY        0029: SYNAPSE      0019: HANADB
0013: TIBERO       0010: ALTIBASE        0016: PPAS         ...
```

**DB 패치 이력 기반 DBMS 확장 이력** (`SQLiteDBPatch이력.txt`에서 인용):

- `2018-06-12`: NETEZZA(`0018`), HANADB(`0019`), IMPALA(`0023`) 신규 추가
- `2018-06-12`: MySQL 전용 타입 추가 — `TINYINT`, `MEDIUMINT`, `YEAR`, `TINYTEXT`, `MEDIUMTEXT`, `GEOMETRY`
- `2018-03-27`: MySQL에 `DATETIME`(`0026`) 추가, `DATE`/`TIME` 코드 순서 수정
- `2017-12-27`: Greenplum 타입 추가
- `2017-07-14`: `STD_DOM`에 보안 관련 컬럼 추가

  ```sql
  alter table STD_DOM add column SECURITY_YN CHAR(1);
  alter table STD_DOM add column SECURITY_LEVEL VARCHAR2(50);
  ```

  → **이 패치 이후부터 도메인별 보안등급 기반 마스킹이 가능**해졌음.

### 2-2. STD_DATATYPE — DBMS별 데이터타입 변환 기준

`STD_DATATYPE` 테이블의 `CD_NO`(공통 타입 식별자)와 `DB_TYPE`(DBMS 코드)의 조합을 통해, 동일 `CD_NO`를 가진 소스 타입과 타겟 타입 간 변환 규칙을 도출한다.

**Oracle → MySQL 주요 타입 변환 예시** (CD_NO 기준):

| CD_NO | Oracle 타입 | MySQL 타입 | 길이 적용 |
|-------|-------------|------------|-----------|
| 0003 | VARCHAR2 | VARCHAR | Y |
| 0008 | CLOB | TEXT | N |
| 0011 | NUMBER | INT | Y |
| 0015 | NUMBER(p,s) | DECIMAL(p,s) | Y |
| 0018 | DATE | DATE | N |
| 0020 | TIMESTAMP | TIMESTAMP | N |
| 0026 | DATE | DATETIME | N |
| 0021 | XMLTYPE | (미지원 NULL) | N |

**Oracle → PostgreSQL 주요 타입 변환 예시**:

| CD_NO | Oracle 타입 | PostgreSQL 타입 | 비고 |
|-------|-------------|-----------------|------|
| 0003 | VARCHAR2 | character varying | Y |
| 0008 | CLOB | text | N |
| 0010 | BLOB | bytea | N |
| 0015 | NUMBER(p,s) | numeric(p,s) | Y |
| 0021 | XMLTYPE | xml | N |
| 0022 | TIMESTAMP WITH TIME ZONE | timestamp with time zone | N |

> `STD_DATATYPE_CONV` 테이블은 현재 데이터가 비어 있으므로, 실제 타입 변환 매핑은 `STD_DATATYPE` 테이블의 `CD_NO` 조인 방식으로 수행한다.

### 2-3. STD_DOM — 개인정보·보안 기반 이관 처리 기준

`STD_DOM` 테이블의 다음 컬럼들이 이관 시 익명화·암호화 판단 기준으로 사용된다.

```
PRIVACY_ACT       NUMBER      — 개인정보보호법 적용 여부 (1: 적용)
PRIVACY_GRADE     VARCHAR2    — 개인정보 등급 (예: 주민번호, 계좌번호 등)
ENCRYPTION        NUMBER      — 암호화 필요 여부 (1: 필요)
ENCRYPTION_METHOD VARCHAR2    — 암호화 방식 (AES256, SHA256 등)
SECURITY_YN       CHAR(1)     — 보안 적용 여부 (Y/N)
SECURITY_LEVEL    VARCHAR2    — 보안 등급 (예: 기밀, 대외비, 일반)
```

### 2-4. STD_DIC — 이관 대상 단어 필터링 기준

`STD_DIC.STANDARD_YN='Y'` : 이관에 포함되는 표준 단어 (예: 고객 CUST, 번호 NO, 금액 AMT)
`STD_DIC.FORBID_YN='Y'`   : 금칙어 — 이관 대상에서 제외

이관 담당자는 `STANDARD_YN='Y' AND FORBID_YN='N'` 조건으로 이관 대상 표준 단어를 확정한다.

---

## ③ 단계별 업무계획

### Phase 0: 이관 범위 정의 (선행조건: 20-modeling 물리 모델 확정)

| 항목 | 내용 |
|------|------|
| **목적** | 이관 대상 주제영역·테이블·속성 범위 확정 |
| **산출물** | 이관 범위 정의서 (STD_AREA 기반 주제영역 목록) |
| **선행조건** | 20-modeling의 `dah_entity.csv`, `dah_attribute.csv` 최종 확정 |
| **도구/방법** | SQLite `STD_AREA`, `STD_DIC` 쿼리, `dah_attribute.csv` 속성 목록 검토 |
| **소요기간** | 1일 |

**수행 내용:**
- `STD_AREA` 테이블에서 이관 대상 주제영역 ID 목록 확보
- `STD_DIC WHERE STANDARD_YN='Y' AND FORBID_YN='N'` 조건으로 이관 포함 단어 목록 추출
- 패키지 시스템 등 표준화 예외 대상 사전 협의 (00-리더 승인)

---

### Phase 1: 샘플 데이터 수집 및 생성

| 항목 | 내용 |
|------|------|
| **목적** | ETL 스크립트 개발·검증용 현실적 샘플 데이터 확보 |
| **산출물** | `gen_sample.py`, 주제영역별 샘플 CSV (각 1,000건 이상) |
| **선행조건** | Phase 0 이관 범위 확정 |
| **도구/방법** | Python `gen_sample.py` (`faker`, `random` 라이브러리 활용) |
| **소요기간** | 2~3일 |

**`gen_sample.py` 구현 계획** (`.claude/skills/data-architecture/40-migration/da-mig-sample-data/scripts/gen_sample.py`):

```python
# 주요 생성 항목 (STD_DIC 기반 표준 단어 활용)
# CUST(고객): 고객번호, 고객명, 연락처, 이메일 — 익명화 처리 필수
# NO(번호):   일련번호, PK 시퀀스
# AMT(금액):  거래금액 (DATA_MIN/DATA_MAX 범위 준수)
# DT(날짜):   거래일자 (DATE 타입 포맷 준수)
# CD(코드):   STD_CODE 코드값 범위 내에서 생성
# YN(여부):   CHAR(1) 'Y'/'N' 고정
```

**주제영역별 샘플 데이터 유형 및 건수:**

| 주제영역 | 대표 엔터티 유형 | 샘플 건수 | 비고 |
|----------|------------------|-----------|------|
| 고객 | 고객기본, 고객연락처 | 5,000건 | 개인정보 포함 — 익명화 필수 |
| 상품 | 상품기본, 상품분류 | 2,000건 | 코드 참조 다수 |
| 거래 | 거래내역, 거래명세 | 10,000건 | 금액·날짜 범위 검증 필요 |
| 코드 | 공통코드, 분류코드 | STD_CODE 기반 | 실제 코드 값 그대로 사용 |

---

### Phase 2: 개인정보 익명화 처리

| 항목 | 내용 |
|------|------|
| **목적** | 이관 과정에서 개인정보·보안 데이터의 안전한 처리 |
| **산출물** | 개인정보 익명화 처리 명세서, 익명화 함수 라이브러리 |
| **선행조건** | Phase 1 샘플 데이터 생성, 10-표준의 STD_DOM 도메인 목록 수신 |
| **도구/방법** | `STD_DOM.PRIVACY_ACT`, `STD_DOM.SECURITY_YN` 기반 자동 판별 |
| **소요기간** | 2일 |

**익명화 대상 식별 쿼리:**

```sql
-- 이관 시 처리 대상 도메인 목록
SELECT DOM_NM, DATA_TYPE_CD, DATA_LEN,
       PRIVACY_ACT, PRIVACY_GRADE,
       ENCRYPTION, ENCRYPTION_METHOD,
       SECURITY_YN, SECURITY_LEVEL
FROM STD_DOM
WHERE PRIVACY_ACT = 1
   OR SECURITY_YN = 'Y'
ORDER BY SECURITY_LEVEL, PRIVACY_GRADE;
```

**익명화 기법 적용 기준:**

| 조건 | 익명화 기법 | 예시 |
|------|-------------|------|
| `PRIVACY_ACT=1` AND `ENCRYPTION=1` | 암호화 (`ENCRYPTION_METHOD` 적용) | AES256 암호화 |
| `PRIVACY_ACT=1` AND `ENCRYPTION=0` | 가명처리 (Pseudonymization) | 이름→난수코드 치환 |
| `SECURITY_YN='Y'` AND `SECURITY_LEVEL='기밀'` | 마스킹 (Masking) | 계좌번호 앞 4자리만 노출 |
| `SECURITY_YN='Y'` AND `SECURITY_LEVEL='대외비'` | 부분 마스킹 | 중간 자릿수 `*` 치환 |
| `SECURITY_YN='Y'` AND `SECURITY_LEVEL='일반'` | 원본 유지 | 처리 불필요 |
| `PRIVACY_GRADE` = 주민번호/여권번호 | 삭제 (Delete) | 이관 시 컬럼 제외 |

---

### Phase 3: 소스-타겟 매핑 설계

| 항목 | 내용 |
|------|------|
| **목적** | 소스 시스템 컬럼과 타겟 시스템 컬럼 간 1:1 변환 규칙 정의 |
| **산출물** | 소스-타겟 컬럼 매핑 정의서 (`mapping_definition.xlsx` 또는 `.csv`) |
| **선행조건** | 20-modeling의 `dah_attribute.csv` 수신, Phase 0 범위 확정 |
| **도구/방법** | `STD_DATATYPE`의 `CD_NO` 조인 기반 타입 변환 자동 생성 |
| **소요기간** | 3일 |

**매핑 설계 방법론:**

1. **속성 목록 기반**: `dah_attribute.csv`의 소스 속성 목록을 타겟 물리 모델에 매핑
2. **타입 변환 자동화**: `STD_DATATYPE` 테이블을 `CD_NO` 기준으로 조인하여 소스 DBMS 타입 → 타겟 DBMS 타입 자동 변환

   ```sql
   -- 소스: Oracle(0001), 타겟: MySQL(0011) 변환 규칙 생성
   SELECT src.DATA_TYPE AS SRC_TYPE,
          tgt.DATA_TYPE AS TGT_TYPE,
          src.LEN_YN
   FROM STD_DATATYPE src
   JOIN STD_DATATYPE tgt ON src.CD_NO = tgt.CD_NO
   WHERE src.DB_TYPE = '0001'
     AND tgt.DB_TYPE = '0011';
   ```

3. **코드 매핑**: `STD_CODE` 코드값 목록 기반으로 소스 코드 → 타겟 코드 변환 규칙 정의

**매핑 정의서 컬럼 구조:**

| 컬럼 | 설명 |
|------|------|
| SRC_TABLE | 소스 테이블명 |
| SRC_COLUMN | 소스 컬럼명 |
| SRC_TYPE | 소스 데이터 타입 |
| TGT_TABLE | 타겟 테이블명 |
| TGT_COLUMN | 타겟 컬럼명 |
| TGT_TYPE | 타겟 데이터 타입 (STD_DATATYPE 변환) |
| CONVERT_RULE | 변환 규칙 (그대로/형변환/코드변환/익명화) |
| PRIVACY_YN | 개인정보 처리 여부 (STD_DOM 기반) |
| REMARKS | 비고 |

---

### Phase 4: ETL 스크립트 개발

| 항목 | 내용 |
|------|------|
| **목적** | 매핑 정의서 기반 실제 데이터 이관 실행 스크립트 개발 |
| **산출물** | DBMS별 ETL 스크립트 (Python 또는 SQL) |
| **선행조건** | Phase 3 매핑 정의서 확정 |
| **도구/방법** | Python (`sqlalchemy`, `cx_Oracle`, `pymysql`, `psycopg2`) |
| **소요기간** | 3~5일 |

**지원 DBMS 조합** (`DA_CODE` 기준 DB 패치 이력에서 확인된 주요 소스-타겟 조합):

| 소스 DBMS | 타겟 DBMS | 변환 시 유의사항 |
|-----------|-----------|-----------------|
| Oracle (0001) | MySQL (0011) | NUMBER → DECIMAL 정밀도, CLOB → TEXT 크기 |
| Oracle (0001) | PostgreSQL (0014) | XMLTYPE → xml, TIMESTAMP WITH TIME ZONE 처리 |
| Oracle (0001) | Greenplum (0017) | 분산키(Distribution Key) 별도 지정 필요 |
| Oracle (0001) | Netezza (0018) | 2018-06-12 패치로 타입 정의 추가됨 |
| Oracle (0001) | Impala (0023) | 2018-06-12 패치; `boolen`(오타) 주의 |
| MySQL (0011) | PostgreSQL (0014) | DATETIME → timestamp, TINYINT → smallint |

**ETL 스크립트 구조:**

```
etl/
├── extract/          # 소스 시스템 추출 쿼리 (테이블별)
├── transform/        # 타입 변환, 코드 매핑, 익명화 처리
├── load/             # 타겟 시스템 적재 스크립트
├── config/           # DBMS 접속 정보 (암호화 보관)
└── run_etl.py        # 전체 파이프라인 실행 진입점
```

---

### Phase 5: 이관 검증

| 항목 | 내용 |
|------|------|
| **목적** | 이관 완료 후 데이터 정합성·무결성 검증 |
| **산출물** | 이관 검증 결과 보고서 |
| **선행조건** | Phase 4 ETL 실행 완료, 30-quality 품질 감리 결과 수신 |
| **도구/방법** | Python 검증 스크립트, SQL COUNT/SUM 비교 |
| **소요기간** | 2일 |

**검증 항목:**

| 검증 유형 | 방법 | 판정 기준 |
|-----------|------|-----------|
| 건수 검증 | `SELECT COUNT(*)` 소스/타겟 비교 | 건수 100% 일치 |
| 값 검증 | 샘플링 기반 소스-타겟 값 비교 (5% 샘플) | 불일치 0건 |
| 합계 검증 | `SELECT SUM(금액컬럼)` 소스/타겟 비교 | 합계 100% 일치 |
| 참조 무결성 | FK 관계 기반 고아 레코드 검출 | 고아 레코드 0건 |
| 타입 검증 | `STD_DATATYPE` 변환 규칙 기반 타입 확인 | 변환 오류 0건 |
| 개인정보 검증 | `STD_DOM.PRIVACY_ACT=1` 컬럼 마스킹 확인 | 원본 노출 0건 |

---

## ④ 타 팀원과의 인터페이스

| 협력 대상 | 방향 | 인터페이스 내용 | 시점 |
|-----------|------|-----------------|------|
| **00-리더** | 수신 | 이관 계획 승인, 예외 협의 결정 | Phase 0 |
| **10-표준** | 수신 | `STD_CODE` 코드값 범위 기준, `STD_DOM` 도메인 값 범위(DATA_MIN/DATA_MAX/DATA_ENUM) | Phase 1~3 |
| **20-모델링** | 수신 | 확정 물리 모델 (`dah_entity.csv`, `dah_attribute.csv`) | Phase 0 선행 |
| **30-품질** | 수신 | 이관 전 품질 감리 결과 (DQ 기준 오류 목록) | Phase 5 직전 |
| **30-품질** | 제공 | 이관 검증 결과 보고서 (건수·값·무결성) | Phase 5 완료 후 |
| **00-리더** | 제공 | 최종 이관 완료 보고 | Phase 5 완료 후 |

---

## ⑤ DBMS별 데이터타입 변환 기준표 (STD_DATATYPE 기반)

`STD_DATATYPE` 테이블의 `CD_NO` 공통 식별자를 기준으로 도출한 DBMS 간 타입 변환 기준:

| CD_NO | 표준 타입 분류 | Oracle | MySQL | PostgreSQL | Greenplum | Netezza |
|-------|---------------|--------|-------|------------|-----------|---------|
| 0001 | 고정길이 문자 | CHAR(n) | CHAR(n) | character(n) | char(n) | CHAR(n) |
| 0003 | 가변길이 문자 | VARCHAR2(n) | VARCHAR(n) | character varying(n) | varchar(n) | VARCHAR(n) |
| 0008 | 대용량 문자 | CLOB | TEXT | text | text | (미지원) |
| 0011 | 정수(소) | NUMBER | INT | decimal | decimal | (미지원) |
| 0015 | 정밀 숫자 | NUMBER(p,s) | DECIMAL(p,s) | numeric(p,s) | numeric(p,s) | NUMERIC(p,s) |
| 0018 | 날짜 | DATE | DATE | date | date | DATE |
| 0020 | 타임스탬프 | TIMESTAMP | TIMESTAMP | timestamp | timestamp | TIMESTAMP |
| 0026 | 날짜+시간 | DATE | DATETIME | — | — | — |

> **주의**: Impala(`0023`) 타입 정의에 `smaillint`(오타, 실제: `smallint`), `boolen`(오타, 실제: `boolean`)이 존재하므로 ETL 스크립트 작성 시 실제 Impala 타입명으로 보정 필요. (2018-06-12 패치 이력 확인)

---

## ⑥ 산출물 체크리스트

- [ ] 이관 범위 정의서 (STD_AREA 기반 주제영역·테이블·속성 목록)
- [ ] 샘플 데이터 생성 스크립트 (`gen_sample.py`)
- [ ] 주제영역별 샘플 CSV (고객 5,000건 / 상품 2,000건 / 거래 10,000건)
- [ ] 개인정보 익명화 처리 명세서 (STD_DOM.PRIVACY_ACT/SECURITY_YN 기반)
- [ ] 소스-타겟 컬럼 매핑 정의서 (`mapping_definition.csv`)
- [ ] DBMS별 데이터타입 변환 기준표 (STD_DATATYPE CD_NO 조인 기반)
- [ ] ETL 변환 스크립트 (소스·타겟 DBMS별)
- [ ] 이관 검증 결과 보고서 (건수·값·합계·무결성·개인정보 5개 항목)
