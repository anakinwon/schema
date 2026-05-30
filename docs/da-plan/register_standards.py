import sys, sqlite3, uuid, openpyxl
sys.stdout.reconfigure(encoding='utf-8')

EXCEL = r'c:\Users\anaki\workspace\claude-nextjs-starters\docs\da-plan\테이블정의서.xlsx'
DB    = r'c:\Users\anaki\workspace\claude-nextjs-starters\.claude\skills\data-architecture-team\1-chief-data-architect\da-common-sqlite-ops\references\SQLiteDB_for_META_v5.db'

con = sqlite3.connect(DB)
con.text_factory = str
cur = con.cursor()
STD_AREA = '{837B8059-C2C4-46DC-97DD-C64661CA447B}'
NOW = '20260530150000'
END = '99991231235959'

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 3: Excel에서 컬럼 정보 읽기
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
wb = openpyxl.load_workbook(EXCEL)
TABLE_SHEETS = [s for s in wb.sheetnames if s != '테이블목록']

col_records = {}  # {phys_name: {'logic':..., 'type':..., 'len':..., 'scale':..., 'table':...}}

print('=== STEP 3: Excel 컬럼 추출 ===')
for sheet in TABLE_SHEETS:
    ws = wb[sheet]
    for row in ws.iter_rows(min_row=3, values_only=True):
        if not row[2]: continue
        phys   = str(row[2]).strip()
        logic  = str(row[1]).strip() if row[1] else ''
        dtype  = str(row[3]).strip() if row[3] else ''
        length = row[4]
        scale  = row[5]
        if phys not in col_records:
            col_records[phys] = {'logic': logic, 'type': dtype,
                                  'len': length, 'scale': scale, 'table': sheet}

print(f'총 {len(col_records)}개 고유 컬럼 추출')

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 4: 컬럼명 단어 분해
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
print()
print('=== STEP 4: 컬럼명 단어 분해 ===')
all_words    = set()
domain_words = set()
col_words    = {}

for phys in col_records:
    parts = phys.upper().split('_')
    col_words[phys] = parts
    for p in parts:
        all_words.add(p)
    domain_words.add(parts[-1])

print(f'전체 고유 단어: {sorted(all_words)}')
print(f'도메인 후보(마지막 단어): {sorted(domain_words)}')

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 5: 표준단어 사전 (지침서 기준)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WORD_DICT = {
    # 기본어
    'PRD':   ('상품',    'Product',          '기본어', '상품/제품을 나타내는 기본어'),
    'CLS':   ('분류',    'Classification',   '기본어', '분류 체계를 나타내는 기본어'),
    'UPR':   ('상위',    'Upper',            '기본어', '계층 구조 상위 개념'),
    'USE':   ('사용',    'Use',              '기본어', '사용 여부 판단 기본어'),
    'SL':    ('판매',    'Sale',             '기본어', '판매 관련 기본어'),
    'INV':   ('재고',    'Inventory',        '기본어', '재고 수량 관련 기본어'),
    'STS':   ('상태',    'Status',           '기본어', '상태 값 기본어'),
    'KND':   ('종류',    'Kind',             '기본어', '종류 구분 기본어'),
    'CT':    ('고객',    'Customer',         '기본어', '고객(소비자) 기본어'),
    'EML':   ('이메일',  'Email',            '기본어', '이메일 주소 기본어'),
    'PWD':   ('비밀번호','Password',         '기본어', '로그인 비밀번호 기본어'),
    'GND':   ('성별',    'Gender',           '기본어', '성별 구분 기본어'),
    'GBN':   ('구분',    'Division',         '기본어', '구분/분류 기본어'),
    'BSIC':  ('기본',    'Basic',            '기본어', '기본 값을 나타내는 기본어'),
    'DTL':   ('상세',    'Detail',           '기본어', '상세 정보 기본어'),
    'OD':    ('주문',    'Order',            '기본어', '주문 관련 기본어'),
    'TOT':   ('합계',    'Total',            '기본어', '합계/총계 기본어'),
    'DLV':   ('배송',    'Delivery',         '기본어', '배송 관련 기본어'),
    'CCL':   ('취소',    'Cancel',           '기본어', '취소 처리 기본어'),
    'REG':   ('등록',    'Register',         '기본어', '등록/생성 시스템 기본어'),
    'MOD':   ('수정',    'Modify',           '기본어', '수정/변경 시스템 기본어'),
    'USR':   ('사용자',  'User',             '기본어', '시스템 사용자 기본어'),
    # 분류어
    'CD':    ('코드',    'Code',             '분류어', '코드 값을 나타내는 분류어'),
    'NM':    ('명칭',    'Name',             '분류어', '명칭/이름을 나타내는 분류어'),
    'NO':    ('번호',    'Number',           '분류어', '식별 번호를 나타내는 분류어'),
    'UP':    ('단가',    'Unit Price',       '분류어', '단위 가격을 나타내는 분류어'),
    'QTY':   ('수량',    'Quantity',         '분류어', '수량을 나타내는 분류어'),
    'CONT':  ('내용',    'Content',          '분류어', '내용/설명을 나타내는 분류어'),
    'ADDR':  ('주소',    'Address',          '분류어', '주소를 나타내는 분류어'),
    'ENC':   ('암호',    'Encryption',       '분류어', '암호화 값을 나타내는 분류어'),
    'BDY':   ('생일',    'Birthday',         '분류어', '생년월일을 나타내는 분류어'),
    'DTS':   ('일시',    'Datetime',         '분류어', '날짜+시각을 나타내는 분류어'),
    'AMT':   ('금액',    'Amount',           '분류어', '금액을 나타내는 분류어'),
    'SEQNO': ('순번',    'Sequence No',      '분류어', '복합PK 전용 순번 분류어'),
    'YN':    ('여부',    'Yes/No',           '분류어', 'Y/N 여부를 나타내는 분류어'),
    'ID':    ('아이디',  'Identifier',       '분류어', '시스템 사용자 식별자 분류어'),
}

# 표준단어 등록에 없는 단어 확인
missing = all_words - set(WORD_DICT.keys())
if missing:
    print(f'[경고] 사전 미정의 단어: {missing}')

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 6: 표준단어 등록 (STD_DIC)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
print()
print('=== STEP 6: 표준단어 등록 (STD_DIC) ===')
word_to_id = {}
for abbr in sorted(all_words):
    if abbr not in WORD_DICT:
        print(f'  [건너뜀] {abbr} - 사전에 없음')
        continue
    log_nm, eng_nm, role, desc = WORD_DICT[abbr]
    dic_id = str(uuid.uuid4())
    cur.execute('''INSERT INTO STD_DIC
        (STD_AREA_ID,DIC_ID,AVAL_END_DT,AVAL_ST_DT,DIC_LOG_NM,DIC_PHY_NM,
         DIC_PHY_FLL_NM,DIC_DESC,ENT_CLSS_YN,ATTR_CLSS_YN,STANDARD_YN,
         FORBID_YN,DOM_NM_USE_YN,DIC_GBN_CD,DOM_USE_YN)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
        (STD_AREA,dic_id,END,NOW,log_nm,abbr,eng_nm,desc,
         'Y' if role=='기본어' else 'N',
         'Y','Y','N','N','0001','N'))
    word_to_id[abbr] = dic_id
    print(f'  [{role}] {abbr} ({log_nm}/{eng_nm})')

con.commit()
print(f'=> STD_DIC 등록: {len(word_to_id)}건')

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 7: 표준도메인 등록 (STD_DOM)
# 마지막 분해 표준단어 = 도메인
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DOMAIN_SPEC = {
    'CD':    ('코드',    '코드도메인',    '0001','0003',None, None),
    'NM':    ('명칭',    '명칭도메인',    '0003','0003',None, None),
    'NO':    ('번호',    '번호도메인',    '0002','0003',None, None),
    'UP':    ('단가',    '단가도메인',    '0003','0015',21,   3),
    'QTY':   ('수량',    '수량도메인',    '0003','0013',None, None),
    'CONT':  ('내용',    '내용도메인',    '0003','0003',None, None),
    'ADDR':  ('주소',    '주소도메인',    '0003','0003',None, None),
    'ENC':   ('암호',    '암호도메인',    '0003','0003',None, None),
    'BDY':   ('생일',    '생일도메인',    '0003','0003',8,    None),
    'DTS':   ('일시',    '일시도메인',    '0003','0020',None, None),
    'AMT':   ('금액',    '금액도메인',    '0003','0015',21,   3),
    'SEQNO': ('순번',    '순번도메인',    '0003','0013',None, None),
    'YN':    ('여부',    '여부도메인',    '0003','0003',1,    None),
    'ID':    ('아이디',  '아이디도메인',  '0002','0003',20,   None),
}

print()
print('=== STEP 7: 표준도메인 등록 (STD_DOM) ===')
dom_to_id = {}
for dw in sorted(domain_words):
    if dw not in DOMAIN_SPEC:
        print(f'  [건너뜀] {dw} - 도메인 스펙 없음')
        continue
    key_nm, dom_nm, dom_tp, data_tp, dlen, dscale = DOMAIN_SPEC[dw]
    ref_dic_id = word_to_id.get(dw)
    dom_id = str(uuid.uuid4())
    cur.execute('''INSERT INTO STD_DOM
        (STD_AREA_ID,DOM_ID,AVAL_END_DT,AVAL_ST_DT,KEY_DOM_NM,DOM_NM,
         DOM_TYPE_CD,DATA_TYPE_CD,DATA_LEN,DATA_SCALE,SECURITY_YN,
         KEY_DOM_PHY_NM,DIC_ID)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)''',
        (STD_AREA,dom_id,END,NOW,key_nm,dom_nm,
         dom_tp,data_tp,dlen,dscale,'N',dw,ref_dic_id))
    dom_to_id[dw] = dom_id
    print(f'  [{dw}] {dom_nm} (타입:{data_tp} 길이:{dlen} DIC연결:{ref_dic_id[:8] if ref_dic_id else "없음"}...)')

con.commit()
print(f'=> STD_DOM 등록: {len(dom_to_id)}건')

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 8: 표준용어 등록 (DA_TERM)
# 표준단어 + 표준도메인 조합
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
print()
print('=== STEP 8: 표준용어 등록 (DA_TERM) ===')
term_cnt = 0
for phys, info in sorted(col_records.items()):
    abbr     = phys.upper()
    term_nm  = info['logic']
    term_id  = f'BSNS.COL.{abbr}'
    parts    = abbr.split('_')
    dom_word = parts[-1]
    dom_nm   = DOMAIN_SPEC.get(dom_word, ('?','?','0003','0003',None,None))[1]
    word_str = '+'.join(parts[:-1]) if len(parts) > 1 else parts[0]
    desc     = f'{term_nm} [{word_str}+{dom_word} / {dom_nm}]'

    cur.execute('''INSERT INTO DA_TERM
        (LANG_CD,SUB_LANG_CD,TERM_ID,TERM_NM,TERM_DESC,TERM_GBN_CD,TERM_ABBR)
        VALUES(?,?,?,?,?,?,?)''',
        ('ko','DEFAULT',term_id,term_nm,desc,'0001',abbr))
    print(f'  {abbr:<24} | {term_nm:<16} | {word_str}+[{dom_word}:{dom_nm}]')
    term_cnt += 1

con.commit()
print(f'=> DA_TERM 등록: {term_cnt}건')

# 최종 현황
print()
print('='*60)
cur.execute('SELECT COUNT(*) FROM STD_DIC');  d = cur.fetchone()[0]
cur.execute('SELECT COUNT(*) FROM STD_DOM');  o = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM DA_TERM WHERE TERM_ID LIKE 'BSNS.COL.%'")
t = cur.fetchone()[0]
print(f'최종: STD_DIC={d}건 / STD_DOM={o}건 / DA_TERM(비즈니스)={t}건')
con.close()
