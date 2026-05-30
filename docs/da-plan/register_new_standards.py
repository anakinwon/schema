import sys, sqlite3, uuid, openpyxl
sys.stdout.reconfigure(encoding='utf-8')
EXCEL = r'c:\Users\anaki\workspace\claude-nextjs-starters\.claude\skills\data-architecture-team\1-chief-data-architect\da-common-sqlite-ops\references\논리모델용_테이블정의서.xlsx'
DB    = r'c:\Users\anaki\workspace\claude-nextjs-starters\.claude\skills\data-architecture-team\1-chief-data-architect\da-common-sqlite-ops\references\SQLiteDB_for_META_v5.db'
con = sqlite3.connect(DB); con.text_factory = str; cur = con.cursor()
STD_AREA = '{837B8059-C2C4-46DC-97DD-C64661CA447B}'
NOW='20260530180000'; END='99991231235959'

STD_MAP = {'PROD':'PRD','DATE':'DT','NAME':'NM','ADD':'ADDR','NUM':'NO',
           'EMAIL':'EML','GEN':'GND','ORDER':'OD','ST':'STS','CANCEL':'CCL','USER':'USR'}

def correct_col(col):
    return '_'.join(STD_MAP.get(p,p) for p in col.upper().split('_')).lower()

# ━━━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 1: Excel 읽기 + 컬럼명 표준화
# ━━━━━━━━━━━━━━━━━━━━━━━━━━
wb = openpyxl.load_workbook(EXCEL)
ws = wb['테이블정의서']
col_records = {}
table_cols  = {}
for row in ws.iter_rows(min_row=2, values_only=True):
    if not row[3]: continue
    orig = str(row[3]).strip()
    corr = correct_col(orig)
    tbl  = str(row[1]).strip()
    if corr not in col_records:
        col_records[corr] = {
            'logic': str(row[2] or ''),
            'dtype': str(row[5] or '').upper(),
            'len':   row[6],
            'nn':    row[7],
            'pk':    row[8],
            'dflt':  row[9],
        }
    table_cols.setdefault(tbl, [])
    if corr not in [c['col'] for c in table_cols[tbl]]:
        table_cols[tbl].append({
            'col':corr,'logic':str(row[2] or ''),'dtype':str(row[5] or '').upper(),
            'len':row[6],'nn':row[7],'pk':row[8],'dflt':row[9]
        })

print(f'[추출] 표준화 컬럼 {len(col_records)}개 / 테이블 {len(table_cols)}개')

# ━━━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 2: 단어 분해
# ━━━━━━━━━━━━━━━━━━━━━━━━━━
cur.execute('SELECT DIC_PHY_NM, DIC_ID FROM STD_DIC')
existing = {r[0]: r[1] for r in cur.fetchall()}
cur.execute('SELECT KEY_DOM_PHY_NM FROM STD_DOM')
existing_dom = {r[0] for r in cur.fetchall()}

all_words = set()
domain_words = set()
for col in col_records:
    parts = col.upper().split('_')
    for p in parts: all_words.add(p)
    domain_words.add(parts[-1])

new_words   = sorted(all_words - set(existing.keys()))
new_dom_words = sorted(domain_words - existing_dom)
print(f'[분해] 전체단어: {len(all_words)}개 / 신규단어: {len(new_words)}개 / 신규도메인: {len(new_dom_words)}개')

# ━━━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 3: 신규 표준단어 등록
# ━━━━━━━━━━━━━━━━━━━━━━━━━━
NEW_WORD_DEFS = {
    'DEPT':  ('부서',    'Department',  '기본어', '조직 내 부서를 나타내는 기본어'),
    'USR':   ('사용자',  'User',        '기본어', '시스템 사용자 기본어 (USR=User)'),  # already exists
    'PHONE': ('전화',    'Phone',       '기본어', '전화번호 관련 기본어'),
    'HOME':  ('자택',    'Home',        '기본어', '자택/집 관련 주소 기본어'),
    'JOIN':  ('입사',    'Join',        '기본어', '입사/채용 관련 기본어'),
    'QUIT':  ('퇴사',    'Quit',        '기본어', '퇴사/이직 관련 기본어'),
    'TYP':   ('유형',    'Type',        '기본어', '유형/종류 분류 기본어'),
    'CNT':   ('건수',    'Count',       '분류어', '건수/횟수/카운트를 나타내는 분류어'),
    'PRICE': ('가격',    'Price',       '분류어', '상품/서비스 가격을 나타내는 분류어'),
}
print()
print('=== STEP 3: 신규 표준단어 등록 ===')
for abbr in new_words:
    if abbr in NEW_WORD_DEFS:
        log_nm, eng_nm, role, desc = NEW_WORD_DEFS[abbr]
        dic_id = str(uuid.uuid4())
        cur.execute('''INSERT INTO STD_DIC
            (STD_AREA_ID,DIC_ID,AVAL_END_DT,AVAL_ST_DT,DIC_LOG_NM,DIC_PHY_NM,
             DIC_PHY_FLL_NM,DIC_DESC,ENT_CLSS_YN,ATTR_CLSS_YN,STANDARD_YN,
             FORBID_YN,DOM_NM_USE_YN,DIC_GBN_CD,DOM_USE_YN)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
            (STD_AREA,dic_id,END,NOW,log_nm,abbr,eng_nm,desc,
             'Y' if role=='기본어' else 'N','Y','Y','N','N','0001','N'))
        existing[abbr] = dic_id
        print(f'  [{role}] {abbr} ({log_nm}/{eng_nm})')
    else:
        print(f'  [미정의] {abbr} — 수동 등록 필요')

# ━━━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 4: 신규 표준도메인 등록
# ━━━━━━━━━━━━━━━━━━━━━━━━━━
NEW_DOM_DEFS = {
    'CNT':   ('건수',    '건수도메인',   '0003','0013',None,None),  # integer
    'PRICE': ('가격',    '가격도메인',   '0003','0015',15,  2),     # numeric(15,2)
}
print()
print('=== STEP 4: 신규 표준도메인 등록 ===')
for dw in new_dom_words:
    if dw in NEW_DOM_DEFS:
        key_nm,dom_nm,dom_tp,data_tp,dlen,dscale = NEW_DOM_DEFS[dw]
        dic_id = existing.get(dw)
        cur.execute('''INSERT INTO STD_DOM
            (STD_AREA_ID,DOM_ID,AVAL_END_DT,AVAL_ST_DT,KEY_DOM_NM,DOM_NM,
             DOM_TYPE_CD,DATA_TYPE_CD,DATA_LEN,DATA_SCALE,SECURITY_YN,KEY_DOM_PHY_NM,DIC_ID)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)''',
            (STD_AREA,str(uuid.uuid4()),END,NOW,key_nm,dom_nm,
             dom_tp,data_tp,dlen,dscale,'N',dw,dic_id))
        existing_dom.add(dw)
        print(f'  {dw} → {dom_nm} (타입:{data_tp} 길이:{dlen})')
    else:
        print(f'  [미정의] {dw} — 도메인 정의 필요')

# ━━━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 5: DA_TERM 업데이트 (기존 삭제 후 재등록)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━
cur.execute("DELETE FROM DA_TERM WHERE TERM_ID LIKE 'BSNS.COL.%'")
print()
print('=== STEP 5: DA_TERM 표준용어 등록 ===')
cur.execute('SELECT KEY_DOM_PHY_NM, DOM_NM FROM STD_DOM')
dom_map = {r[0]: r[1] for r in cur.fetchall()}

def find_dom(abbr):
    parts = abbr.split('_')
    for n in [3,2,1]:
        k = '_'.join(parts[-n:]) if n<=len(parts) else None
        if k and k in dom_map: return k, dom_map[k]
    return None, '?'

term_cnt = 0
for col, info in sorted(col_records.items()):
    abbr    = col.upper()
    term_id = f'BSNS.COL.{abbr}'
    parts   = abbr.split('_')
    dk, dn  = find_dom(abbr)
    words   = '+'.join(parts[:-1]) if len(parts)>1 else parts[0]
    desc    = f'{info["logic"]} [{words}+[{dk}:{dn}]]'
    cur.execute('''INSERT INTO DA_TERM
        (LANG_CD,SUB_LANG_CD,TERM_ID,TERM_NM,TERM_DESC,TERM_GBN_CD,TERM_ABBR)
        VALUES(?,?,?,?,?,?,?)''',
        ('ko','DEFAULT',term_id,info['logic'],desc,'0001',abbr))
    print(f'  {abbr:<26} | {info["logic"]:<14} | {words}+[{dk}:{dn}]')
    term_cnt += 1

con.commit()
print()
cur.execute('SELECT COUNT(*) FROM STD_DIC');  d=cur.fetchone()[0]
cur.execute('SELECT COUNT(*) FROM STD_DOM');  o=cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM DA_TERM WHERE TERM_ID LIKE 'BSNS.COL.%'"); t=cur.fetchone()[0]
print(f'최종: STD_DIC={d}건 / STD_DOM={o}건 / DA_TERM(비즈니스)={t}건')

# ━━━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 6: DDL 생성
# ━━━━━━━━━━━━━━━━━━━━━━━━━━
print()
print('=== STEP 6: DDL 생성 ===')
cur.execute('SELECT KEY_DOM_PHY_NM, DATA_TYPE_CD, DATA_LEN, DATA_SCALE FROM STD_DOM')
dom_type = {r[0]:{'tc':r[1],'l':r[2],'s':r[3]} for r in cur.fetchall()}

def pg_type(abbr, dtype, dlen):
    parts = abbr.split('_')
    for n in [3,2,1]:
        k = '_'.join(parts[-n:]) if n<=len(parts) else None
        if k and k in dom_type:
            d = dom_type[k]
            if d['tc']=='0003': return ('character varying(' + str(d['l']) + ')') if d['l'] else 'text'
            if d['tc']=='0013': return 'integer'
            if d['tc']=='0015': return 'numeric(' + str(d['l']) + ',' + str(d['s']) + ')'
            if d['tc']=='0020': return 'timestamp'
            if d['tc']=='0018': return 'date'
    # fallback: Excel 타입 사용
    dt = dtype.lower()
    if 'number' in dt or 'int' in dt: return 'integer'
    if 'timestamp' in dt: return 'timestamp'
    if 'varchar' in dt: return f'character varying({dlen})' if dlen else 'character varying(100)'
    return 'text'

SYS = [
    ('regr_id','character varying(50)','NOT NULL DEFAULT \'ADMIN\''),
    ('reg_dtm', 'timestamp',           'NOT NULL DEFAULT CURRENT_TIMESTAMP'),
    ('modr_id','character varying(50)','NOT NULL DEFAULT \'ADMIN\''),
    ('mod_dtm', 'timestamp',           'NOT NULL DEFAULT CURRENT_TIMESTAMP'),
]

ddl_all = []
for tbl, cols in table_cols.items():
    biz_cols = [c for c in cols if c['col'] not in ('regr_id','reg_dtm','modr_id','mod_dtm')]
    lines = []
    pks = [c['col'] for c in biz_cols if c['pk']]
    for c in biz_cols:
        abbr = c['col'].upper()
        pgt  = pg_type(abbr, c['dtype'], c['len'])
        nn   = 'NOT NULL' if c['nn'] == 'Y' else 'NULL'
        dflt = f" DEFAULT {c['dflt']}" if c['dflt'] else ''
        col_name = c['col']
        lines.append(f'    {col_name:<22} {pgt:<30} {nn}{dflt}')
    for s in SYS:
        lines.append(f'    {s[0]:<22} {s[1]:<30} {s[2]}')
    if len(pks) == 1:
        lines.append(f'    CONSTRAINT pk_{tbl} PRIMARY KEY ({pks[0]})')
    elif pks:
        lines.append(f'    CONSTRAINT pk_{tbl} PRIMARY KEY ({", ".join(pks)})')
    ddl = f'CREATE TABLE {tbl} (\n' + ',\n'.join(lines) + '\n);'
    ddl_all.append(ddl)
    print(f'[DDL] {tbl}: {len(biz_cols)}개 비즈니스컬럼 + 4개 시스템컬럼')

# DDL 파일 저장
DDL_PATH = r'c:\Users\anaki\workspace\claude-nextjs-starters\docs\da-plan\ddl\03_new_tables.sql'
with open(DDL_PATH, 'w', encoding='utf-8') as f:
    f.write('\n\n'.join(ddl_all))
print(f'\n[저장] {DDL_PATH}')
con.close()
