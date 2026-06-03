import sys, sqlite3, uuid
sys.stdout.reconfigure(encoding='utf-8')

DB = r'c:\Users\anaki\workspace\claude-nextjs-starters\.claude\skills\data-architecture-team\1-chief-data-architect\da-common-sqlite-ops\references\SQLiteDB_for_META_v5.db'
STD_AREA = '{837B8059-C2C4-46DC-97DD-C64661CA447B}'
NOW = '20260531090000'
END = '99991231235959'

con = sqlite3.connect(DB)
con.text_factory = str
cur = con.cursor()

cur.execute('SELECT DIC_PHY_NM, DIC_ID FROM STD_DIC')
existing_dic = {r[0]: r[1] for r in cur.fetchall()}
cur.execute('SELECT KEY_DOM_PHY_NM, DOM_ID FROM STD_DOM')
existing_dom = {r[0]: r[1] for r in cur.fetchall()}
cur.execute("SELECT TERM_ABBR FROM DA_TERM WHERE TERM_ID LIKE 'BSNS.COL.%'")
existing_terms = {r[0].lower() for r in cur.fetchall()}

print(f'시작: STD_DIC={len(existing_dic)} / STD_DOM={len(existing_dom)} / DA_TERM={len(existing_terms)}')
print()

# ── STEP 1: DTS 표준단어 추가 (v2 시스템컬럼 접미어)
if 'DTS' not in existing_dic:
    dic_id = str(uuid.uuid4())
    cur.execute('''INSERT INTO STD_DIC
        (STD_AREA_ID,DIC_ID,AVAL_END_DT,AVAL_ST_DT,DIC_LOG_NM,DIC_PHY_NM,
         DIC_PHY_FLL_NM,DIC_DESC,ENT_CLSS_YN,ATTR_CLSS_YN,STANDARD_YN,
         FORBID_YN,DOM_NM_USE_YN,DIC_GBN_CD,DOM_USE_YN)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
        (STD_AREA, dic_id, END, NOW,
         '일시', 'DTM', 'Datetime',
         '날짜+시각을 나타내는 분류어. 시스템컬럼(reg_dtm/mod_dtm/del_dtm) 및 업무 일시(_dtm) 전용.',
         'N', 'Y', 'Y', 'N', 'N', '0001', 'N'))
    existing_dic['DTM'] = dic_id
    print('[STD_DIC] DTS 등록 완료 (일시/Datetime Stamp)')
else:
    print('[STD_DIC] DTS 이미 존재')

# ── STEP 2: DTM 도메인 추가 (TIMESTAMPTZ 타입, 코드 0020)
if 'DTM' not in existing_dom:
    dom_id = str(uuid.uuid4())
    cur.execute('''INSERT INTO STD_DOM
        (STD_AREA_ID,DOM_ID,AVAL_END_DT,AVAL_ST_DT,KEY_DOM_NM,DOM_NM,
         DOM_TYPE_CD,DATA_TYPE_CD,DATA_LEN,DATA_SCALE,SECURITY_YN,
         KEY_DOM_PHY_NM,DIC_ID)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)''',
        (STD_AREA, dom_id, END, NOW,
         '일시', '일시도메인(DTM)', '0003', '0020',
         None, None, 'N', 'DTM', existing_dic['DTM']))
    existing_dom['DTM'] = dom_id
    print('[STD_DOM] DTM 등록 완료 (TIMESTAMPTZ 타입)')
else:
    print('[STD_DOM] DTM 이미 존재')

con.commit()
print()

# ── STEP 3: 쇼핑몰 02 DDL 누락 표준용어 28건 등록
MISSING = [
    # (물리컬럼명, 논리명, 도메인키, 비고)
    # tb_product_category
    ('prd_cls_cd',     '상품분류코드',     'CD',    'tb_product_category PK'),
    ('prd_cls_nm',     '상품분류명',       'NM',    'tb_product_category'),
    ('upr_prd_cls_cd', '상위상품분류코드', 'CD',    '자기참조 FK — NULL=최상위'),
    # tb_product
    ('prd_sl_up',      '상품판매단가',     'UP',    '1단위 판매가 numeric(21,3)'),
    ('prd_inv_qty',    '상품재고수량',     'QTY',   '현재 재고 수량'),
    ('prd_sts_knd_cd', '상품상태종류코드', 'CD',    '01=판매중 02=품절 03=판매중지'),
    ('prd_cont',       '상품내용',         'CONT',  '상품 설명(TEXT)'),
    # tb_customer
    ('ct_no',          '고객번호',         'NO',    'tb_customer PK'),
    ('ct_nm',          '고객명',           'NM',    '고객 실명/등록명'),
    ('ct_eml_addr',    '고객이메일주소',   'ADDR',  'UNIQUE 이메일'),
    ('ct_pwd_enc',     '고객비밀번호암호', 'ENC',   '암호화 저장'),
    ('ct_bdy',         '고객생일',         'BDY',   'YYYYMMDD'),
    ('gnd_gbn_cd',     '성별구분코드',     'CD',    '01=남 02=여 09=기타'),
    ('ct_sts_knd_cd',  '고객상태종류코드', 'CD',    '01=정상 02=휴면 03=탈퇴'),
    ('ct_bsic_addr',   '고객기본주소',     'ADDR',  '도로명/지번 200자'),
    ('ct_dtl_addr',    '고객상세주소',     'ADDR',  '동호수 등 100자'),
    # tb_order
    ('od_dtm',         '주문일시',         'DTM',   '주문 접수 일시 TIMESTAMPTZ'),
    ('od_tot_amt',     '주문합계금액',     'AMT',   '전체 상품 합계 numeric(21,3)'),
    ('dlv_bsic_addr',  '배송기본주소',     'ADDR',  '배송지 기본주소 200자'),
    ('dlv_dtl_addr',   '배송상세주소',     'ADDR',  '배송지 상세주소 100자'),
    ('od_sts_knd_cd',  '주문상태종류코드', 'CD',    '01~07: 주문접수~반품'),
    # tb_order_item
    ('od_seqno',       '주문순번',         'SEQNO', '복합PK 전용 순번'),
    ('od_qty',         '주문수량',         'QTY',   '1 이상'),
    ('od_up',          '주문단가',         'UP',    '주문 시점 단가 numeric(21,3)'),
    ('od_amt',         '주문금액',         'AMT',   'od_qty × od_up'),
    ('ccl_yn',         '취소여부',         'YN',    'Y=취소 N=정상'),
    # 시스템컬럼 (_dtm 접미어 통일)
    ('reg_dtm',        '등록일시',         'DTM',   '시스템컬럼 — 행 생성 일시'),
    ('mod_dtm',        '수정일시',         'DTM',   '시스템컬럼 — 행 수정 일시'),
]

print(f'=== DA_TERM 쇼핑몰 컬럼 등록 ({len(MISSING)}건 대상) ===')
inserted = 0
skipped  = 0
for (abbr, logic, dom_key, note) in MISSING:
    if abbr in existing_terms:
        print(f'  [SKIP] {abbr.upper():<26} 이미 등록됨')
        skipped += 1
        continue
    abbr_upper = abbr.upper()
    term_id    = f'BSNS.COL.{abbr_upper}'
    parts      = abbr_upper.split('_')
    dom_nm     = existing_dom.get(dom_key, '?')
    words      = '+'.join(parts[:-1]) if len(parts) > 1 else parts[0]
    full_desc  = f'{logic} [{words}+[{dom_key}]] — {note}'

    cur.execute('''INSERT INTO DA_TERM
        (LANG_CD,SUB_LANG_CD,TERM_ID,TERM_NM,TERM_DESC,TERM_GBN_CD,TERM_ABBR)
        VALUES(?,?,?,?,?,?,?)''',
        ('ko', 'DEFAULT', term_id, logic, full_desc, '0001', abbr))
    print(f'  [등록] {abbr_upper:<26} | {logic:<14} | {words}+[{dom_key}]')
    existing_terms.add(abbr)
    inserted += 1

con.commit()

# ── 최종 현황 출력
print()
cur.execute('SELECT COUNT(*) FROM STD_DIC');  d = cur.fetchone()[0]
cur.execute('SELECT COUNT(*) FROM STD_DOM');  o = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM DA_TERM WHERE TERM_ID LIKE 'BSNS.COL.%'"); t = cur.fetchone()[0]
print('=' * 60)
print(f'최종: STD_DIC={d}건 / STD_DOM={o}건 / DA_TERM(비즈니스)={t}건')
print(f'이번 등록: {inserted}건 신규 / {skipped}건 스킵')
con.close()
