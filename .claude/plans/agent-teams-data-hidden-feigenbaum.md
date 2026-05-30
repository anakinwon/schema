# DA 표준 준수 테이블/컬럼 설계 및 Supabase 배포 계획 v2
## (새 경로 + 메타 DB 기등록 확인 반영)

## Context

**상황**: 새 디렉토리 구조(`data-architecture-team/`)로 이전됐고, 이전 작업에서 설계한 쇼핑몰 표준이 SQLite 메타DB에 **이미 등록 완료**됨. 이제 해당 표준을 근거로 **PostgreSQL DDL 생성 + Supabase 배포 + ERD 문서화**를 수행한다.

### 확정된 경로
```
지침서 4종:
  C:/Users/anaki/workspace/claude-nextjs-starters/.claude/skills/data-architecture-team/
    2-data-standards-steward/da-std-naming-rules/references/
      10.표준단어_지침서.docx
      20.표준도메인_지침서.docx
      30.표준용어_지침서.docx
      40.표준코드_지침서.docx
      명명규칙-{주제영역,엔터티,속성}.pptx

SQLite 메타DB:
  C:/Users/anaki/workspace/claude-nextjs-starters/.claude/skills/data-architecture-team/
    1-chief-data-architect/da-common-sqlite-ops/references/SQLiteDB_for_META_v5.db
```

### 메타DB 현재 상태 (이미 등록된 표준)

**STD_DIC (표준단어) — 38건 등록 완료**

| 단어명 | 약어 | 영문명 | 역할 |
|--------|------|--------|------|
| 고객 | CT | CUSTOMER | 기본어 |
| 주문 | OD | Order | 기본어 |
| 상품 | PRD | Product | 기본어 |
| 배송 | DLV | Delivery | 기본어 |
| 결제 | PAY | Payment | 기본어 |
| 이메일 | EML | Email | 기본어 |
| 비밀번호 | PWD | Password | 기본어 |
| 성별 | GND | Gender | 기본어 |
| 분류 | CLS | Classification | 기본어 |
| 등록 | REG | Register | 기본어 |
| 수정 | MOD | Modify | 기본어 |
| 취소 | CCL | Cancel | 기본어 |
| 재고 | INV | Inventory | 기본어 |
| 판매 | SL | Sale | 기본어 |
| 기본 | BSIC | Basic | 기본어 |
| 상세 | DTL | Detail | 기본어 |
| 상위 | UPR | Upper | 기본어 |
| 합계 | TOT | Total | 기본어 |
| 사용 | USE | Use | 기본어 |
| 수량 | QTY | Quantity | 기본어 |
| 번호 | NO | NUMBER | 분류어 |
| 코드 | CD | CODE | 분류어 |
| 명칭 | NM | NAME | 분류어 |
| 일자 | DT | DATE | 분류어 |
| 금액 | AMT | AMOUNT | 분류어 |
| 여부 | YN | YES_NO | 분류어 |
| 내용 | CONT | CONTENT | 분류어 |
| 순서 | ORD | ORDER | 분류어 |
| 상태 | STS | STATUS | 분류어 |
| 일시 | DTS | Datetime | 분류어 |
| 단가 | UP | Unit Price | 분류어 |
| 주소 | ADDR | Address | 분류어 |
| 암호 | ENC | Encryption | 분류어 |
| 유형 | TP | Type | 분류어(코드구분자) |
| 구분 | GBN | Division | 분류어(코드구분자) |
| 종류 | KND | Kind | 분류어(코드구분자) |
| 생일 | BDY | Birthday | 분류어 |
| 순번 | SEQNO | Sequence No | 분류어(복합PK전용) |

**STD_DOM (표준도메인) — 17건 등록 완료**

| 도메인명 | 타입CD | 길이 | 소수 | PostgreSQL 타입 |
|---------|--------|-----|------|---------------|
| 고객번호도메인 | 0003(VARCHAR) | 20 | - | character varying(20) |
| 고객명도메인 | 0003(VARCHAR) | 100 | - | character varying(100) |
| 상품번호도메인 | 0003(VARCHAR) | 10 | - | character varying(10) |
| 주문번호도메인 | 0003(VARCHAR) | 20 | - | character varying(20) |
| 상품분류코드도메인 | 0003(VARCHAR) | 10 | - | character varying(10) |
| 기본주소도메인 | 0003(VARCHAR) | 200 | - | character varying(200) |
| 상세주소도메인 | 0003(VARCHAR) | 100 | - | character varying(100) |
| 단가도메인 | 0015(NUMERIC) | 21 | 3 | numeric(21,3) |
| 수량도메인 | 0013(INTEGER) | 5 | - | integer |
| 생일도메인 | 0003(VARCHAR) | 8 | - | character varying(8) |
| 암호도메인 | 0003(VARCHAR) | 500 | - | character varying(500) |
| 일시도메인 | 0020(TIMESTAMP) | - | - | timestamp |
| 처리금액도메인 | 0015(NUMERIC) | 18 | 2 | numeric(18,2) |
| 처리일자도메인 | 0018(DATE) | - | - | date |
| 코드2자리도메인 | 0003(VARCHAR) | 2 | - | character varying(2) |
| 분류코드도메인 | 0003(VARCHAR) | 10 | - | character varying(10) |
| 순번도메인 | 0013(INTEGER) | 5 | - | integer |

**STD_CODE (표준코드) — 16건 등록 완료**

| 코드그룹 | 코드값 | 코드값명 |
|---------|--------|---------|
| 성별구분코드(E1000001) | 01/02/09 | 남성/여성/기타 |
| 고객상태종류코드(E2000001) | 01/02/03 | 정상/휴면/탈퇴 |
| 상품상태종류코드(E3000001) | 01/02/03 | 판매중/품절/판매중지 |
| 주문상태종류코드(E4000001) | 01~07 | 주문접수/결제완료/배송준비/배송중/배송완료/취소/반품 |

---

## 1. 테이블 설계 (지침서 준수 확인 완료)

### 주제영역 (명명규칙-주제영역.pptx 준수)
```
업무(C)_고객(CS)/기본(I)  → CCSI → tb_customer
업무(C)_상품(PR)/분류(C)  → CPRC → tb_product_category
업무(C)_상품(PR)/기본(I)  → CPRI → tb_product
업무(C)_주문(OD)/기본(I)  → CODI → tb_order
업무(C)_주문(OD)/상세(D)  → CODD → tb_order_item
```

### 테이블별 컬럼 명세

**컬럼명 생성 규칙**: 표준단어 약어를 `_`로 연결  
예) 고객(CT)+비밀번호(PWD)+암호(ENC) → `ct_pwd_enc`

#### tb_customer (고객/기본_고객, CCSI)
```sql
ct_no          character varying(20)  PK  NOT NULL   -- 고객번호(CT+NO)
ct_nm          character varying(100) NOT NULL        -- 고객명(CT+NM)
ct_eml_addr    character varying(200) NULL UNIQUE     -- 고객이메일주소(CT+EML+ADDR)
ct_pwd_enc     character varying(500) NOT NULL        -- 고객비밀번호암호(CT+PWD+ENC, 암호화)
ct_bdy         character varying(8)   NULL            -- 고객생일(CT+BDY, YYYYMMDD)
gnd_gbn_cd     character varying(2)   NULL            -- 성별구분코드(GND+GBN+CD)
ct_sts_knd_cd  character varying(2)   NOT NULL '01'  -- 고객상태종류코드(CT+STS+KND+CD)
ct_bsic_addr   character varying(200) NULL            -- 고객기본주소(CT+BSIC+ADDR)
ct_dtl_addr    character varying(100) NULL            -- 고객상세주소(CT+DTL+ADDR)
reg_dts        timestamp              NOT NULL CURRENT_TIMESTAMP  -- 등록일시(REG+DTS)
mod_dts        timestamp              NULL            -- 수정일시(MOD+DTS)
```

#### tb_product_category (상품/분류_상품분류, CPRC)
```sql
prd_cls_cd     character varying(10)  PK  NOT NULL   -- 상품분류코드(PRD+CLS+CD, 개별코드)
prd_cls_nm     character varying(100) NOT NULL        -- 상품분류명(PRD+CLS+NM)
upr_prd_cls_cd character varying(10)  NULL            -- 상위상품분류코드(UPR+PRD+CLS+CD, 자기참조)
use_yn         character varying(1)   NOT NULL 'Y'   -- 사용여부(USE+YN) CHECK IN('Y','N')
reg_dts        timestamp              NOT NULL CURRENT_TIMESTAMP
```

#### tb_product (상품/기본_상품, CPRI)
```sql
prd_no         character varying(10)  PK  NOT NULL   -- 상품번호(PRD+NO)
prd_nm         character varying(200) NOT NULL        -- 상품명(PRD+NM)
prd_cls_cd     character varying(10)  NOT NULL        -- 상품분류코드(PRD+CLS+CD) FK→tb_product_category
prd_sl_up      numeric(21,3)          NOT NULL 0     -- 상품판매단가(PRD+SL+UP) CHECK(>=0)
prd_inv_qty    integer                NOT NULL 0     -- 상품재고수량(PRD+INV+QTY) CHECK(>=0)
prd_sts_knd_cd character varying(2)   NOT NULL '01' -- 상품상태종류코드(PRD+STS+KND+CD)
prd_cont       text                   NULL            -- 상품내용(PRD+CONT)
reg_dts        timestamp              NOT NULL CURRENT_TIMESTAMP
mod_dts        timestamp              NULL
```

#### tb_order (주문/기본_주문, CODI)
```sql
od_no          character varying(20)  PK  NOT NULL   -- 주문번호(OD+NO)
ct_no          character varying(20)  NOT NULL        -- 고객번호(CT+NO) FK→tb_customer
od_dts         timestamp              NOT NULL CURRENT_TIMESTAMP  -- 주문일시(OD+DTS)
od_tot_amt     numeric(21,3)          NOT NULL 0     -- 주문합계금액(OD+TOT+AMT)
dlv_bsic_addr  character varying(200) NULL            -- 배송기본주소(DLV+BSIC+ADDR)
dlv_dtl_addr   character varying(100) NULL            -- 배송상세주소(DLV+DTL+ADDR)
od_sts_knd_cd  character varying(2)   NOT NULL '01' -- 주문상태종류코드(OD+STS+KND+CD)
reg_dts        timestamp              NOT NULL CURRENT_TIMESTAMP
mod_dts        timestamp              NULL
```

#### tb_order_item (주문/상세_주문상품, CODD)
```sql
od_no          character varying(20)  PK NOT NULL     -- 주문번호(OD+NO) PK+FK→tb_order
od_seqno       integer                PK NOT NULL     -- 주문순번(OD+SEQNO) 복합PK
prd_no         character varying(10)  NOT NULL        -- 상품번호(PRD+NO) FK→tb_product
od_qty         integer                NOT NULL 1      -- 주문수량(OD+QTY) CHECK(>=1)
od_up          numeric(21,3)          NOT NULL        -- 주문단가(OD+UP) CHECK(>=0)
od_amt         numeric(21,3)          NOT NULL        -- 주문금액(OD+AMT) = od_qty × od_up
ccl_yn         character varying(1)   NOT NULL 'N'  -- 취소여부(CCL+YN) CHECK IN('Y','N')
```

---

## 2. 산출물 파일

```
docs/da-plan/
├── ddl/
│   ├── 01_meta_standard_insert.sql   ← 메타DB에 이미 등록된 표준 INSERT SQL (문서화용)
│   └── 02_create_tables_postgresql.sql  ← Supabase 배포용 CREATE TABLE DDL
└── erd-shopping.md                   ← Mermaid ERD + 표준 근거 인용 문서
```

---

## 3. 실행 단계

### STEP 1: 산출물 디렉토리 생성
```bash
mkdir -p docs/da-plan/ddl
```

### STEP 2: SQL 파일 생성 (단일 에이전트)
**담당**: 6-physical-database-engineer 역할에 해당  
**메타DB 경로**: `C:/.../.claude/skills/data-architecture-team/1-chief-data-architect/da-common-sqlite-ops/references/SQLiteDB_for_META_v5.db`  
**작업 내용**:
1. SQLite에서 현재 STD_DIC(38건)/STD_DOM(17건)/STD_CODE(16건) 전체 조회
2. `01_meta_standard_insert.sql` 생성: 현재 메타DB 내용을 재현하는 INSERT SQL (문서화·이식용)
3. `02_create_tables_postgresql.sql` 생성: 5개 테이블 CREATE TABLE DDL  
   - 지침서 준수 체크포인트 9개를 모두 주석으로 명시
   - CREATE SEQUENCE + 제약조건 + 인덱스 포함
4. `docs/da-plan/erd-shopping.md` 생성: Mermaid ERD + 각 컬럼별 표준 근거 표

### STEP 3: Supabase MCP로 직접 배포
**순서** (FK 의존성 순서 엄수):
1. `tb_product_category` → 2. `tb_product` → 3. `tb_customer` → 4. `tb_order` → 5. `tb_order_item`

### STEP 4: 배포 결과 검증
- 각 테이블 컬럼 타입, NULL/DEFAULT, PK/FK 확인
- 코드컬럼(`_knd_cd`,`_gbn_cd`) CHECK 제약 확인
- 금액컬럼 `numeric(21,3)` 확인
- 여부컬럼 `character varying(1)` + CHECK IN('Y','N') 확인

---

## 4. 지침서 준수 체크포인트

| # | 규칙 | 지침서 근거 | 검증 방법 |
|---|------|-----------|---------|
| 1 | CHAR 미사용, VARCHAR 일원화 | 도메인지침서 §4.2 | DDL에 CHAR 없음 확인 |
| 2 | 금액 = numeric(21,3) | 도메인지침서 §4.2 금액NB21.3 | od_tot_amt, prd_sl_up, od_up, od_amt |
| 3 | 여부 = VC1 + CHECK('Y','N') | 도메인지침서 §4.3 | use_yn, ccl_yn |
| 4 | 코드 = VC2 + 구분자3개만 | 코드지침서 §6.5-6.6 | _knd_cd, _gbn_cd 접미어 |
| 5 | 컬럼명 = 약어_약어 형식 | 용어지침서 §5.1 영문명 규칙 | ct_no, od_tot_amt 등 |
| 6 | 순번은 복합PK 전용 | 용어지침서 §5.4 | od_seqno (복합PK에만) |
| 7 | 주소: 기본(200)+상세(100) | 단어지침서 §3.3 연락처 | bsic_addr(200), dtl_addr(100) |
| 8 | 일시는 TIMESTAMP 도메인 | 도메인지침서 §4.2 날짜TS | reg_dts, mod_dts, od_dts |
| 9 | 암호화 컬럼 = ~암호(ENC) | 도메인지침서 §4.3 암호화 | ct_pwd_enc |
