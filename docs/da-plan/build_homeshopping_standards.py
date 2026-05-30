"""
홈쇼핑 테이블정의서 기반 DA 표준 전체 구축 스크립트
Phase 1: Excel 읽기 + 컬럼명 표준화
Phase 2: 표준단어 등록 (STD_DIC DIC_GBN_CD='0001')
Phase 3: 표준도메인 등록 (STD_DOM + STD_DIC 분류어 물리명 연결)
Phase 4: 표준용어 등록 (STD_DIC DIC_GBN_CD='0002' + STD_WORD_COMBI)
Phase 5: PostgreSQL DDL 생성
"""
import sys, sqlite3, uuid, openpyxl
sys.stdout.reconfigure(encoding='utf-8')

EXCEL = r'c:\Users\anaki\workspace\claude-nextjs-starters\.claude\skills\data-architecture-team\1-chief-data-architect\da-common-sqlite-ops\references\논리모델용_테이블정의서.xlsx'
DB    = r'c:\Users\anaki\workspace\claude-nextjs-starters\.claude\skills\data-architecture-team\1-chief-data-architect\da-common-sqlite-ops\references\SQLiteDB_for_META_v5.db'
DDL_OUT = r'c:\Users\anaki\workspace\claude-nextjs-starters\docs\da-plan\ddl\04_homeshopping_tables.sql'

STD_AREA = '{837B8059-C2C4-46DC-97DD-C64661CA447B}'
NOW = '20260531120000'
END = '99991231235959'

# 비표준 → 표준 단어 약어 변환 맵
STD_MAP = {
    'PROD':   'PRD',
    'DATE':   'DT',
    'NAME':   'NM',
    'ADD':    'ADDR',
    'NUM':    'NO',
    'EMAIL':  'EML',
    'GEN':    'GND',
    'ORDER':  'OD',
    'ST':     'STS',
    'CANCEL': 'CCL',
    'USER':   'USR',
}

def normalize(col: str) -> str:
    parts = col.upper().split('_')
    return '_'.join(STD_MAP.get(p, p) for p in parts).lower()

# ─────────────────────────────────────────────
# Phase 1: Excel 읽기
# ─────────────────────────────────────────────
print('=' * 65)
print('Phase 1: Excel 읽기 + 컬럼명 표준화')
print('=' * 65)
wb = openpyxl.load_workbook(EXCEL)
ws = wb['테이블정의서']

table_cols = {}   # {tbl_phys: [{norm_col, logic_nm, dtype, dlen, notnull, pk, dflt}]}
col_records = {}  # {norm_col: {logic_nm, dtype, dlen, notnull, pk, dflt}}

for row in ws.iter_rows(min_row=2, values_only=True):
    if not row[4]: continue
    orig_col  = str(row[4]).strip()
    norm_col  = normalize(orig_col)
    tbl       = str(row[2]).strip()
    logic_nm  = str(row[3]).strip() if row[3] else ''
    dtype     = str(row[6]).strip().lower() if row[6] else ''
    dlen      = row[7]
    notnull   = str(row[8]).strip().upper() if row[8] else ''
    pk        = str(row[9]).strip().upper() if row[9] else ''
    dflt      = str(row[10]).strip() if row[10] else ''
    changed   = ' ← 정규화' if norm_col != orig_col else ''
    print(f'  {tbl:<18} {orig_col:<20} → {norm_col:<22}{changed}')

    rec = {'col': norm_col, 'logic': logic_nm, 'dtype': dtype,
           'len': dlen, 'nn': notnull, 'pk': pk, 'dflt': dflt}
    table_cols.setdefault(tbl, [])
    if not any(c['col'] == norm_col for c in table_cols[tbl]):
        table_cols[tbl].append(rec)
    if norm_col not in col_records:
        col_records[norm_col] = rec

print(f'\n테이블 {len(table_cols)}개 / 고유 컬럼 {len(col_records)}개 추출 완료')

# ─────────────────────────────────────────────
# Phase 2: 표준단어 정의 사전
# ─────────────────────────────────────────────
# (기본어, 분류어 구분 + 분류어는 DATA_TYPE 포함)
WORD_DEFS = {
    # ── 기본어 (base words)
    'DEPT':  ('부서',   'Department',     '기본어', None,      None, None),
    'USE':   ('사용',   'Use',            '기본어', None,      None, None),
    'REGR':  ('등록자', 'Registrant',     '기본어', None,      None, None),
    'REG':   ('등록',   'Register',       '기본어', None,      None, None),
    'MODR':  ('수정자', 'Modifier',       '기본어', None,      None, None),
    'MOD':   ('수정',   'Modify',         '기본어', None,      None, None),
    'USR':   ('사용자', 'User',           '기본어', None,      None, None),
    'PHONE': ('전화',   'Phone',          '기본어', None,      None, None),
    'EML':   ('이메일', 'Email',          '기본어', None,      None, None),
    'HOME':  ('자택',   'Home',           '기본어', None,      None, None),
    'GND':   ('성별',   'Gender',         '기본어', None,      None, None),
    'JOIN':  ('입사',   'Join',           '기본어', None,      None, None),
    'QUIT':  ('퇴사',   'Quit',           '기본어', None,      None, None),
    'PRD':   ('상품',   'Product',        '기본어', None,      None, None),
    'TYP':   ('유형',   'Type',           '기본어', None,      None, None),
    'UP':    ('상위',   'Upper',          '기본어', None,      None, None),
    'OD':    ('주문',   'Order',          '기본어', None,      None, None),
    'CCL':   ('취소',   'Cancel',         '기본어', None,      None, None),
    'STS':   ('상태',   'Status',         '기본어', None,      None, None),
    # ── 분류어 (domain words) — DATA_TYPE 필수
    'NO':    ('번호',   'Number',         '분류어', 'VARCHAR',   None, None),
    'NM':    ('명칭',   'Name',           '분류어', 'VARCHAR',   None, None),
    'YN':    ('여부',   'Yes/No',         '분류어', 'VARCHAR',      1, None),
    'ID':    ('아이디', 'Identifier',     '분류어', 'VARCHAR',     20, None),
    'DTM':   ('일시',   'Datetime',       '분류어', 'TIMESTAMP', None, None),
    'ADDR':  ('주소',   'Address',        '분류어', 'TEXT',      None, None),
    'CD':    ('코드',   'Code',           '분류어', 'VARCHAR',   None, None),
    'DT':    ('일자',   'Date',           '분류어', 'DATE',      None, None),
    'PRICE': ('가격',   'Price',          '분류어', 'NUMERIC',     15,    2),
    'CNT':   ('건수',   'Count',          '분류어', 'INTEGER',   None, None),
}

# 도메인 정의 (분류어와 1:1 대응)
DOMAIN_DEFS = {
    'NO':    ('번호',   '번호도메인',   '0002', '0003', None, None, 'VARCHAR — 식별 번호 문자열'),
    'NM':    ('명칭',   '명칭도메인',   '0003', '0003', None, None, 'VARCHAR — 명칭/이름 문자열'),
    'YN':    ('여부',   '여부도메인',   '0003', '0003',    1, None, "VARCHAR(1) — 'Y' 또는 'N'"),
    'ID':    ('아이디', '아이디도메인', '0002', '0003',   20, None, 'VARCHAR(20) — 시스템 사용자 아이디'),
    'DTM':   ('일시',   '일시도메인',   '0003', '0020', None, None, 'TIMESTAMP — 날짜+시각 일시'),
    'ADDR':  ('주소',   '주소도메인',   '0003', '0003', None, None, 'TEXT — 주소 (기본 200자 / 상세 100자)'),
    'CD':    ('코드',   '코드도메인',   '0001', '0003', None, None, 'VARCHAR — 코드 (STD_CODE 코드셋 정의 따름)'),
    'DT':    ('일자',   '일자도메인',   '0003', '0018', None, None, 'DATE — 날짜(일자) YYYYMMDD'),
    'PRICE': ('가격',   '가격도메인',   '0003', '0015',   15,    2, 'NUMERIC(15,2) — 상품가격'),
    'CNT':   ('건수',   '건수도메인',   '0003', '0013', None, None, 'INTEGER — 건수/횟수'),
}

# ─────────────────────────────────────────────────────────────────────────────
con = sqlite3.connect(DB)
con.text_factory = str
cur = con.cursor()

# ─────────────────────────────────────────────
# Phase 2: STD_DIC 표준단어 등록
# ─────────────────────────────────────────────
print()
print('=' * 65)
print('Phase 2: STD_DIC 표준단어 등록 (DIC_GBN_CD=0001)')
print('=' * 65)

# 필요한 단어 추출 (컬럼명 분해)
needed_words = set()
for col in col_records:
    for p in col.upper().split('_'):
        needed_words.add(p)

word_to_id = {}
w_inserted = 0

for abbr in sorted(needed_words):
    if abbr not in WORD_DEFS:
        print(f'  [⚠ 미정의] {abbr} — WORD_DEFS에 없음, 건너뜀')
        continue
    log_nm, eng_nm, role, data_type, data_len, data_scale = WORD_DEFS[abbr]

    # 이미 존재하는지 확인
    cur.execute("SELECT DIC_ID FROM STD_DIC WHERE DIC_PHY_NM=? AND DIC_GBN_CD='0001'", (abbr,))
    row = cur.fetchone()
    if row:
        word_to_id[abbr] = row[0]
        print(f'  [SKIP] {abbr:<8} 이미 존재')
        continue

    dic_id = str(uuid.uuid4())
    is_domain = role == '분류어'
    cur.execute('''
        INSERT INTO STD_DIC (
            STD_AREA_ID, DIC_ID, AVAL_END_DT, AVAL_ST_DT,
            DIC_LOG_NM, DIC_PHY_NM, DIC_PHY_FLL_NM, DIC_DESC,
            ENT_CLSS_YN, ATTR_CLSS_YN, STANDARD_YN, FORBID_YN,
            DOM_NM_USE_YN, DIC_GBN_CD, DOM_USE_YN,
            DATA_TYPE, DATA_LEN, DATA_SCALE
        ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ''', (
        STD_AREA, dic_id, END, NOW,
        log_nm, abbr, eng_nm,
        f'{role} — {eng_nm}({log_nm})',
        'Y' if role == '기본어' else 'N', 'Y', 'Y', 'N',
        'N', '0001',
        'N',                  # DOM_USE_YN — 분류어 연결은 Phase 3에서
        data_type, data_len, data_scale,
    ))
    word_to_id[abbr] = dic_id
    type_str = f'{data_type}{"(" + str(data_len) + ("," + str(data_scale) if data_scale else "") + ")" if data_len else ""}' if data_type else '-'
    print(f'  [등록] {abbr:<8} | {log_nm:<6} | {role} | 물리타입={type_str}')
    w_inserted += 1

con.commit()
print(f'\n=> 표준단어 신규 {w_inserted}건 등록')

# ─────────────────────────────────────────────
# Phase 3: STD_DOM 표준도메인 등록 + STD_DIC 분류어 물리명 연결
# ─────────────────────────────────────────────
print()
print('=' * 65)
print('Phase 3: STD_DOM 표준도메인 등록')
print('=' * 65)

dom_to_id = {}
d_inserted = 0

for abbr, (key_nm, dom_nm, dom_tp, data_tp, dlen, dscale, desc) in DOMAIN_DEFS.items():
    cur.execute('SELECT DOM_ID FROM STD_DOM WHERE KEY_DOM_PHY_NM=?', (abbr,))
    row = cur.fetchone()
    if row:
        dom_to_id[abbr] = row[0]
        print(f'  [SKIP] {abbr:<8} 도메인 이미 존재')
        continue

    ref_dic_id = word_to_id.get(abbr)
    dom_id = str(uuid.uuid4())
    sql_type = WORD_DEFS[abbr][3]
    sql_len  = WORD_DEFS[abbr][4]
    sql_scl  = WORD_DEFS[abbr][5]

    cur.execute('''
        INSERT INTO STD_DOM (
            STD_AREA_ID, DOM_ID, AVAL_END_DT, AVAL_ST_DT,
            KEY_DOM_NM, DOM_NM, DOM_DESC,
            DOM_TYPE_CD, DATA_TYPE_CD, DATA_LEN, DATA_SCALE,
            SECURITY_YN, KEY_DOM_PHY_NM, DIC_ID
        ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ''', (
        STD_AREA, dom_id, END, NOW,
        key_nm, dom_nm,
        f'[물리타입] {sql_type}{"(" + str(sql_len) + ("," + str(sql_scl) if sql_scl else "") + ")" if sql_len else ""} — {desc}',
        dom_tp, data_tp, dlen, dscale,
        'N', abbr, ref_dic_id,
    ))
    dom_to_id[abbr] = dom_id

    # STD_DIC 분류어에 DOM_USE_YN + DOM_ID 연결
    if ref_dic_id:
        cur.execute('''
            UPDATE STD_DIC SET DOM_USE_YN='Y', DOM_NM_USE_YN='Y', DOM_ID=?
            WHERE DIC_ID=? AND DIC_GBN_CD='0001'
        ''', (dom_id, ref_dic_id))

    type_str = f'{sql_type}{"(" + str(sql_len) + ("," + str(sql_scl) if sql_scl else "") + ")" if sql_len else ""}'
    print(f'  [등록] {abbr:<8} → {dom_nm:<16} | {type_str}')
    d_inserted += 1

con.commit()
print(f'\n=> 표준도메인 신규 {d_inserted}건 등록')

# ─────────────────────────────────────────────
# Phase 4: STD_DIC 표준용어 등록 + STD_WORD_COMBI
# ─────────────────────────────────────────────
print()
print('=' * 65)
print('Phase 4: STD_DIC 표준용어 등록 (DIC_GBN_CD=0002) + STD_WORD_COMBI')
print('=' * 65)

cur.execute("SELECT DIC_PHY_NM FROM STD_DIC WHERE DIC_GBN_CD='0002'")
existing_terms = {r[0].lower() for r in cur.fetchall()}
t_inserted = 0

for norm_col, rec in sorted(col_records.items()):
    if norm_col in existing_terms:
        print(f'  [SKIP] {norm_col:<26} 이미 존재')
        continue

    parts    = norm_col.upper().split('_')
    dom_word = parts[-1]
    dom_id   = dom_to_id.get(dom_word)
    dom_nm   = DOMAIN_DEFS.get(dom_word, ('?','?','','','','',' '))[1] if dom_word in DOMAIN_DEFS else '미연결'

    comp_ids = [word_to_id[p] for p in parts if p in word_to_id]
    stored   = ','.join(comp_ids)
    sorted_  = ','.join(sorted(comp_ids))

    dic_id = str(uuid.uuid4())
    cur.execute('''
        INSERT INTO STD_DIC (
            STD_AREA_ID, DIC_ID, AVAL_END_DT, AVAL_ST_DT,
            DIC_LOG_NM, DIC_PHY_NM, DIC_PHY_FLL_NM, DIC_DESC,
            ENT_CLSS_YN, ATTR_CLSS_YN, STANDARD_YN, FORBID_YN,
            DOM_NM_USE_YN, DIC_GBN_CD, TERM_GBN_CD, DOM_USE_YN,
            DOM_ID, STORED_TERM_COMP_IDS, SORTED_TERM_COMP_IDS
        ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ''', (
        STD_AREA, dic_id, END, NOW,
        rec['logic'], norm_col, norm_col.upper(),
        f'{rec["logic"]} [{"+".join(parts)}+[{dom_word}:{dom_nm}]]',
        'N', 'Y', 'Y', 'N',
        'Y', '0002', '0001',
        'Y' if dom_id else 'N',
        dom_id, stored or None, sorted_ or None,
    ))
    # STD_WORD_COMBI
    for order, p in enumerate(parts, start=1):
        if p in word_to_id:
            cur.execute('''
                INSERT INTO STD_WORD_COMBI
                    (STD_AREA_ID, TERM_ID, TGT_GBN_CD, ORDER_NO, WORD_ID, AVAL_END_DT, AVAL_ST_DT)
                VALUES(?,?,?,?,?,?,?)
            ''', (STD_AREA, dic_id, '0001', order, word_to_id[p], END, NOW))

    words_disp = '+'.join(f'{p}({WORD_DEFS.get(p, ("?",))[0]})' for p in parts if p in WORD_DEFS)
    print(f'  [등록] {norm_col.upper():<26} | {rec["logic"]:<14} | {words_disp} → [{dom_word}:{dom_nm}]')
    existing_terms.add(norm_col)
    t_inserted += 1

con.commit()
print(f'\n=> 표준용어 신규 {t_inserted}건 등록')

# ─────────────────────────────────────────────
# Phase 5: PostgreSQL DDL 생성
# ─────────────────────────────────────────────
print()
print('=' * 65)
print('Phase 5: PostgreSQL DDL 생성')
print('=' * 65)

def pg_type(col: str, excel_dtype: str, excel_len) -> str:
    parts = col.upper().split('_')
    dom = parts[-1]
    # 도메인 기반 타입 우선
    if dom == 'NO':    return f'character varying({int(excel_len) if excel_len else 20})'
    if dom == 'NM':    return f'character varying({int(excel_len) if excel_len else 100})'
    if dom == 'CD':    return f'character varying({int(excel_len) if excel_len else 10})'
    if dom == 'YN':    return 'character varying(1)'
    if dom == 'ID':    return 'character varying(20)'
    if dom == 'DTM':   return 'timestamp'
    if dom == 'ADDR':  return 'text'
    if dom == 'DT':    return 'date'        # 표준: DATE (varchar→date 변환)
    if dom == 'PRICE': return 'numeric(15,2)'
    if dom == 'CNT':   return 'integer'
    # 폴백: Excel 타입 사용
    dt = (excel_dtype or '').lower()
    if 'timestamp' in dt:    return 'timestamp'
    if 'number' in dt:       return 'integer'
    if 'varchar' in dt:      return f'character varying({int(excel_len)})' if excel_len else 'text'
    return 'text'

# 시스템 컬럼 (Excel 기준 유지)
SYS_COLS = [
    ('regr_id', 'character varying(50)', "NOT NULL DEFAULT 'ADMIN'"),
    ('reg_dtm',  'timestamp',             'NOT NULL DEFAULT CURRENT_TIMESTAMP'),
    ('modr_id', 'character varying(50)', "NOT NULL DEFAULT 'ADMIN'"),
    ('mod_dtm',  'timestamp',             'NOT NULL DEFAULT CURRENT_TIMESTAMP'),
]
SYS_NAMES = {s[0] for s in SYS_COLS}

ddl_parts = []
for tbl, cols in table_cols.items():
    biz_cols = [c for c in cols if c['col'] not in SYS_NAMES]
    pks = [c['col'] for c in biz_cols if c['pk'] == 'Y']
    lines = []
    for c in biz_cols:
        pgt  = pg_type(c['col'], c['dtype'], c['len'])
        nn   = 'NOT NULL' if c['nn'] == 'Y' else 'NULL'
        dflt = f" DEFAULT {c['dflt']}" if c['dflt'] else ''
        lines.append(f'    {c["col"]:<24} {pgt:<30} {nn}{dflt}')
    for (sc, st, sd) in SYS_COLS:
        lines.append(f'    {sc:<24} {st:<30} {sd}')
    if len(pks) == 1:
        lines.append(f'    CONSTRAINT pk_{tbl} PRIMARY KEY ({pks[0]})')
    elif pks:
        lines.append(f'    CONSTRAINT pk_{tbl} PRIMARY KEY ({", ".join(pks)})')

    comment = f'-- {tbl}\n'
    ddl = comment + f'CREATE TABLE IF NOT EXISTS {tbl} (\n' + ',\n'.join(lines) + '\n);'
    ddl_parts.append(ddl)
    print(f'  {tbl}: 비즈니스컬럼 {len(biz_cols)}개 + 시스템컬럼 4개')

full_ddl = '\n\n'.join(ddl_parts)
import os; os.makedirs(r'c:\Users\anaki\workspace\claude-nextjs-starters\docs\da-plan\ddl', exist_ok=True)
with open(DDL_OUT, 'w', encoding='utf-8') as f:
    f.write(full_ddl)
print(f'\n=> DDL 파일 저장: {DDL_OUT}')

# ─────────────────────────────────────────────
# 최종 현황
# ─────────────────────────────────────────────
print()
print('=' * 65)
print('최종 현황')
print('=' * 65)
cur.execute("SELECT COUNT(*) FROM STD_DIC WHERE DIC_GBN_CD='0001'"); print(f'  STD_DIC 표준단어(0001): {cur.fetchone()[0]}건')
cur.execute("SELECT COUNT(*) FROM STD_DIC WHERE DIC_GBN_CD='0002'"); print(f'  STD_DIC 표준용어(0002): {cur.fetchone()[0]}건')
cur.execute('SELECT COUNT(*) FROM STD_DOM');                         print(f'  STD_DOM 표준도메인    : {cur.fetchone()[0]}건')
cur.execute('SELECT COUNT(*) FROM STD_WORD_COMBI');                  print(f'  STD_WORD_COMBI        : {cur.fetchone()[0]}건')
con.close()

print()
print('DDL 미리보기:')
print(full_ddl[:800], '...')
