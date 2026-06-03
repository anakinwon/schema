-- ============================================================
-- 파일명  : 02_create_tables_postgresql.sql
-- 목적    : 쇼핑몰 5개 테이블 Supabase(PostgreSQL) 배포용 DDL
-- 지침서  : 표준단어·도메인·용어·코드 지침서, 명명규칙 3종
-- 작성일  : 2026-05-30
-- 배포순서: FK 의존성 순서 — ①product_category → ②product → ③customer → ④order → ⑤order_item
-- ============================================================
-- 지침서 준수 체크포인트 9개
-- #1 CHAR 미사용, VARCHAR 일원화                (도메인지침서 §4.2)
-- #2 금액 = numeric(21,3)                       (도메인지침서 §4.2 금액NB21.3)
-- #3 여부 = varchar(1) + CHECK('Y','N')         (도메인지침서 §4.3)
-- #4 코드 = varchar(2) + 구분자 3개만(_knd_cd, _gbn_cd, _cls_cd)  (코드지침서 §6.5-6.6)
-- #5 컬럼명 = 약어_약어 형식                     (용어지침서 §5.1)
-- #6 순번(SEQNO)은 복합PK 전용                  (용어지침서 §5.4)
-- #7 주소: 기본(200) + 상세(100)                (단어지침서 §3.3)
-- #8 일시는 TIMESTAMPTZ 도메인 (타임존 인식)      (도메인지침서 §4.2, 2026-06-02 timestamp→timestamptz 전환)
-- #9 암호화 컬럼 = ~암호(ENC)                   (도메인지침서 §4.3)
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- ① tb_product_category (상품/분류_상품분류, CPRC)
--    자기참조 FK: upr_prd_cls_cd → prd_cls_cd (계층 카테고리)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tb_product_category (
    prd_cls_cd      character varying(10)   NOT NULL,           -- 상품분류코드 (PRD+CLS+CD) #4
    prd_cls_nm      character varying(100)  NOT NULL,           -- 상품분류명 (PRD+CLS+NM) #5
    upr_prd_cls_cd  character varying(10)   NULL,              -- 상위상품분류코드 (UPR+PRD+CLS+CD) 자기참조
    use_yn          character varying(1)    NOT NULL DEFAULT 'Y', -- 사용여부 (USE+YN) #3
    reg_dtm         timestamptz             NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 등록일시 #8
    CONSTRAINT pk_product_category PRIMARY KEY (prd_cls_cd),
    CONSTRAINT fk_product_category_self FOREIGN KEY (upr_prd_cls_cd)
        REFERENCES tb_product_category (prd_cls_cd),
    CONSTRAINT ck_product_category_use_yn CHECK (use_yn IN ('Y', 'N')) -- #3
);

COMMENT ON TABLE  tb_product_category               IS '상품분류 (CPRC)';
COMMENT ON COLUMN tb_product_category.prd_cls_cd    IS '상품분류코드 — 개별 분류 식별자';
COMMENT ON COLUMN tb_product_category.upr_prd_cls_cd IS '상위상품분류코드 — NULL이면 최상위';
COMMENT ON COLUMN tb_product_category.use_yn        IS '사용여부 Y/N';

CREATE INDEX IF NOT EXISTS idx_product_category_upr ON tb_product_category (upr_prd_cls_cd);


-- ────────────────────────────────────────────────────────────
-- ② tb_product (상품/기본_상품, CPRI)
--    FK: prd_cls_cd → tb_product_category
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tb_product (
    prd_no          character varying(10)   NOT NULL,           -- 상품번호 (PRD+NO) #5
    prd_nm          character varying(200)  NOT NULL,           -- 상품명 (PRD+NM)
    prd_cls_cd      character varying(10)   NOT NULL,           -- 상품분류코드 (PRD+CLS+CD) FK
    prd_sl_up       numeric(21,3)           NOT NULL DEFAULT 0, -- 상품판매단가 (PRD+SL+UP) #2
    prd_inv_qty     integer                 NOT NULL DEFAULT 0, -- 상품재고수량 (PRD+INV+QTY)
    prd_sts_knd_cd  character varying(2)    NOT NULL DEFAULT '01', -- 상품상태종류코드 (PRD+STS+KND+CD) #4
    prd_cont        text                    NULL,               -- 상품내용 (PRD+CONT)
    reg_dtm         timestamptz             NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 등록일시 #8
    mod_dtm         timestamptz             NULL,               -- 수정일시 #8
    CONSTRAINT pk_product PRIMARY KEY (prd_no),
    CONSTRAINT fk_product_category FOREIGN KEY (prd_cls_cd)
        REFERENCES tb_product_category (prd_cls_cd),
    CONSTRAINT ck_product_sl_up     CHECK (prd_sl_up >= 0),    -- 단가 0 이상
    CONSTRAINT ck_product_inv_qty   CHECK (prd_inv_qty >= 0),  -- 재고 0 이상
    CONSTRAINT ck_product_sts_knd_cd CHECK (prd_sts_knd_cd IN ('01','02','03')) -- E3: 판매중/품절/판매중지
);

COMMENT ON TABLE  tb_product              IS '상품 (CPRI)';
COMMENT ON COLUMN tb_product.prd_sl_up    IS '상품판매단가 numeric(21,3) — 지침서 §4.2 금액NB21.3';
COMMENT ON COLUMN tb_product.prd_sts_knd_cd IS '상품상태종류코드 E3: 01=판매중 02=품절 03=판매중지';

CREATE INDEX IF NOT EXISTS idx_product_cls ON tb_product (prd_cls_cd);
CREATE INDEX IF NOT EXISTS idx_product_sts ON tb_product (prd_sts_knd_cd);


-- ────────────────────────────────────────────────────────────
-- ③ tb_customer (고객/기본_고객, CCSI)
--    독립 테이블 (상위 FK 없음)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tb_customer (
    ct_no           character varying(20)   NOT NULL,           -- 고객번호 (CT+NO) #5
    ct_nm           character varying(100)  NOT NULL,           -- 고객명 (CT+NM)
    ct_eml_addr     character varying(200)  NULL,              -- 고객이메일주소 (CT+EML+ADDR) #7 기본주소 길이 기준
    ct_pwd_enc      character varying(500)  NOT NULL,           -- 고객비밀번호암호 (CT+PWD+ENC) #9 암호화
    ct_bdy          character varying(8)    NULL,              -- 고객생일 (CT+BDY) YYYYMMDD
    gnd_gbn_cd      character varying(2)    NULL,              -- 성별구분코드 (GND+GBN+CD) #4
    ct_sts_knd_cd   character varying(2)    NOT NULL DEFAULT '01', -- 고객상태종류코드 (CT+STS+KND+CD) #4
    ct_bsic_addr    character varying(200)  NULL,              -- 고객기본주소 (CT+BSIC+ADDR) #7 200자
    ct_dtl_addr     character varying(100)  NULL,              -- 고객상세주소 (CT+DTL+ADDR) #7 100자
    reg_dtm         timestamptz             NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 등록일시 #8
    mod_dtm         timestamptz             NULL,               -- 수정일시 #8
    CONSTRAINT pk_customer       PRIMARY KEY (ct_no),
    CONSTRAINT uq_customer_eml   UNIQUE (ct_eml_addr),
    CONSTRAINT ck_customer_gnd_gbn_cd  CHECK (gnd_gbn_cd IS NULL OR gnd_gbn_cd IN ('01','02','09')), -- E1: 남성/여성/기타
    CONSTRAINT ck_customer_sts_knd_cd  CHECK (ct_sts_knd_cd IN ('01','02','03'))                     -- E2: 정상/휴면/탈퇴
);

COMMENT ON TABLE  tb_customer              IS '고객 (CCSI)';
COMMENT ON COLUMN tb_customer.ct_pwd_enc   IS '고객비밀번호암호 — 지침서 §4.3 암호화 컬럼은 _enc 접미어';
COMMENT ON COLUMN tb_customer.ct_bdy       IS '고객생일 YYYYMMDD 8자리 문자열';
COMMENT ON COLUMN tb_customer.gnd_gbn_cd   IS '성별구분코드 E1: 01=남성 02=여성 09=기타 (NULL 허용)';
COMMENT ON COLUMN tb_customer.ct_sts_knd_cd IS '고객상태종류코드 E2: 01=정상 02=휴면 03=탈퇴';


-- ────────────────────────────────────────────────────────────
-- ④ tb_order (주문/기본_주문, CODI)
--    FK: ct_no → tb_customer
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tb_order (
    od_no           character varying(20)   NOT NULL,           -- 주문번호 (OD+NO) #5
    ct_no           character varying(20)   NOT NULL,           -- 고객번호 (CT+NO) FK
    od_dts          timestamptz             NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 주문일시 #8
    od_tot_amt      numeric(21,3)           NOT NULL DEFAULT 0, -- 주문합계금액 (OD+TOT+AMT) #2
    dlv_bsic_addr   character varying(200)  NULL,              -- 배송기본주소 (DLV+BSIC+ADDR) #7
    dlv_dtl_addr    character varying(100)  NULL,              -- 배송상세주소 (DLV+DTL+ADDR) #7
    od_sts_knd_cd   character varying(2)    NOT NULL DEFAULT '01', -- 주문상태종류코드 (OD+STS+KND+CD) #4
    reg_dtm         timestamptz             NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 등록일시 #8
    mod_dtm         timestamptz             NULL,               -- 수정일시 #8
    CONSTRAINT pk_order          PRIMARY KEY (od_no),
    CONSTRAINT fk_order_customer FOREIGN KEY (ct_no) REFERENCES tb_customer (ct_no),
    CONSTRAINT ck_order_tot_amt     CHECK (od_tot_amt >= 0),
    CONSTRAINT ck_order_sts_knd_cd  CHECK (od_sts_knd_cd IN ('01','02','03','04','05','06','07')) -- E4
);

COMMENT ON TABLE  tb_order              IS '주문 (CODI)';
COMMENT ON COLUMN tb_order.od_tot_amt   IS '주문합계금액 numeric(21,3) — 지침서 §4.2 금액NB21.3';
COMMENT ON COLUMN tb_order.od_sts_knd_cd IS '주문상태종류코드 E4: 01=주문접수 02=결제완료 03=배송준비 04=배송중 05=배송완료 06=취소 07=반품';

CREATE INDEX IF NOT EXISTS idx_order_ct    ON tb_order (ct_no);
CREATE INDEX IF NOT EXISTS idx_order_sts   ON tb_order (od_sts_knd_cd);
CREATE INDEX IF NOT EXISTS idx_order_dts   ON tb_order (od_dts DESC);


-- ────────────────────────────────────────────────────────────
-- ⑤ tb_order_item (주문/상세_주문상품, CODD)
--    복합PK: (od_no, od_seqno) — SEQNO는 복합PK 전용 #6
--    FK: od_no → tb_order, prd_no → tb_product
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tb_order_item (
    od_no           character varying(20)   NOT NULL,           -- 주문번호 (OD+NO) PK+FK
    od_seqno        integer                 NOT NULL,           -- 주문순번 (OD+SEQNO) 복합PK 전용 #6
    prd_no          character varying(10)   NOT NULL,           -- 상품번호 (PRD+NO) FK
    od_qty          integer                 NOT NULL DEFAULT 1, -- 주문수량 (OD+QTY) 1 이상
    od_up           numeric(21,3)           NOT NULL,           -- 주문단가 (OD+UP) #2
    od_amt          numeric(21,3)           NOT NULL,           -- 주문금액 (OD+AMT) = od_qty × od_up #2
    ccl_yn          character varying(1)    NOT NULL DEFAULT 'N', -- 취소여부 (CCL+YN) #3
    CONSTRAINT pk_order_item     PRIMARY KEY (od_no, od_seqno), -- 복합PK
    CONSTRAINT fk_order_item_order   FOREIGN KEY (od_no)   REFERENCES tb_order   (od_no),
    CONSTRAINT fk_order_item_product FOREIGN KEY (prd_no)  REFERENCES tb_product (prd_no),
    CONSTRAINT ck_order_item_qty    CHECK (od_qty >= 1),
    CONSTRAINT ck_order_item_up     CHECK (od_up  >= 0),
    CONSTRAINT ck_order_item_amt    CHECK (od_amt >= 0),
    CONSTRAINT ck_order_item_ccl_yn CHECK (ccl_yn IN ('Y', 'N')) -- #3
);

COMMENT ON TABLE  tb_order_item           IS '주문상품 (CODD)';
COMMENT ON COLUMN tb_order_item.od_seqno  IS '주문순번 — 복합PK 전용, 단독PK에는 SEQNO 사용 불가(지침서 §5.4)';
COMMENT ON COLUMN tb_order_item.od_amt    IS '주문금액 = od_qty × od_up (애플리케이션 레이어에서 계산 후 저장)';
COMMENT ON COLUMN tb_order_item.ccl_yn    IS '취소여부 Y/N';

CREATE INDEX IF NOT EXISTS idx_order_item_prd ON tb_order_item (prd_no);
