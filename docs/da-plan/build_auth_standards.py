"""
권한관리 시스템 DA 표준 등록
신규: 표준단어 7건, 표준도메인 1건(LVL), 표준용어 13건
"""
import sys, sqlite3, uuid
sys.stdout.reconfigure(encoding='utf-8')

DB  = r'c:\Users\anaki\workspace\claude-nextjs-starters\.claude\skills\data-architecture-team\1-chief-data-architect\da-common-sqlite-ops\references\SQLiteDB_for_META_v5.db'
STD_AREA = '{837B8059-C2C4-46DC-97DD-C64661CA447B}'
NOW = '20260531140000'; END = '99991231235959'

con = sqlite3.connect(DB); con.text_factory = str; cur = con.cursor()

# 기존 단어 로드
cur.execute("SELECT DIC_PHY_NM, DIC_ID FROM STD_DIC WHERE DIC_GBN_CD='0001'")
word_dic = {r[0]: r[1] for r in cur.fetchall()}
cur.execute('SELECT KEY_DOM_PHY_NM, DOM_ID FROM STD_DOM')
dom_dic  = {r[0]: r[1] for r in cur.fetchall()}
cur.execute("SELECT DIC_PHY_NM FROM STD_DIC WHERE DIC_GBN_CD='0002'")
term_set = {r[0].lower() for r in cur.fetchall()}

# ── 신규 표준단어
NEW_WORDS = {
    'ROLE': ('역할',   'Role',       '기본어', None,      None, None),
    'PERM': ('권한',   'Permission', '기본어', None,      None, None),
    'GRP':  ('그룹',   'Group',      '기본어', None,      None, None),
    'MBR':  ('구성원', 'Member',     '기본어', None,      None, None),
    'CAT':  ('범주',   'Category',   '기본어', None,      None, None),
    'GRNT': ('부여',   'Grant',      '기본어', None,      None, None),
    'LVL':  ('레벨',   'Level',      '분류어', 'INTEGER', None, None),
}

print('=== Phase 2-1: 표준단어 등록 ===')
for abbr, (log_nm, eng_nm, role, data_type, dlen, dscale) in NEW_WORDS.items():
    if abbr in word_dic:
        print(f'  [SKIP] {abbr}')
        continue
    dic_id = str(uuid.uuid4())
    cur.execute('''
        INSERT INTO STD_DIC (STD_AREA_ID,DIC_ID,AVAL_END_DT,AVAL_ST_DT,
            DIC_LOG_NM,DIC_PHY_NM,DIC_PHY_FLL_NM,DIC_DESC,
            ENT_CLSS_YN,ATTR_CLSS_YN,STANDARD_YN,FORBID_YN,
            DOM_NM_USE_YN,DIC_GBN_CD,DOM_USE_YN,DATA_TYPE,DATA_LEN,DATA_SCALE)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ''', (STD_AREA,dic_id,END,NOW,log_nm,abbr,eng_nm,
          f'{role} — {eng_nm}({log_nm})',
          'Y' if role=='기본어' else 'N','Y','Y','N','N','0001','N',
          data_type,dlen,dscale))
    word_dic[abbr] = dic_id
    type_str = f'{data_type}' if data_type else '-'
    print(f'  [등록] {abbr:<8} | {log_nm:<6} | {role} | 물리타입={type_str}')

con.commit()

# ── LVL 도메인 등록
print()
print('=== Phase 2-2: 표준도메인 등록 (LVL) ===')
if 'LVL' not in dom_dic:
    dom_id = str(uuid.uuid4())
    ref_dic_id = word_dic.get('LVL')
    cur.execute('''
        INSERT INTO STD_DOM (STD_AREA_ID,DOM_ID,AVAL_END_DT,AVAL_ST_DT,
            KEY_DOM_NM,DOM_NM,DOM_DESC,DOM_TYPE_CD,DATA_TYPE_CD,DATA_LEN,DATA_SCALE,
            SECURITY_YN,KEY_DOM_PHY_NM,DIC_ID)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ''', (STD_AREA,dom_id,END,NOW,'레벨','레벨번호도메인',
          '[물리타입] INTEGER — 계층 레벨 번호 (1=최상위)',
          '0003','0013',None,None,'N','LVL',ref_dic_id))
    dom_dic['LVL'] = dom_id
    # STD_DIC 분류어 연결
    if ref_dic_id:
        cur.execute("UPDATE STD_DIC SET DOM_USE_YN='Y',DOM_NM_USE_YN='Y',DOM_ID=? WHERE DIC_ID=?",
                    (dom_id, ref_dic_id))
    print('  [등록] LVL → 레벨번호도메인 (INTEGER)')
else:
    print('  [SKIP] LVL 도메인')
con.commit()

# ── 표준용어 등록
print()
print('=== Phase 2-3: 표준용어 등록 (DIC_GBN_CD=0002) ===')
NEW_TERMS = [
    ('role_cd',     '역할코드',     'CD'),
    ('role_nm',     '역할명',       'NM'),
    ('role_lvl',    '역할레벨',     'LVL'),
    ('role_cont',   '역할설명',     'CONT'),
    ('perm_cd',     '권한코드',     'CD'),
    ('perm_nm',     '권한명',       'NM'),
    ('perm_cat_cd', '권한범주코드', 'CD'),
    ('perm_cont',   '권한설명',     'CONT'),
    ('grnt_yn',     '부여여부',     'YN'),
    ('grp_cd',      '그룹코드',     'CD'),
    ('grp_nm',      '그룹명',       'NM'),
    ('grp_cont',    '그룹설명',     'CONT'),
    ('mbr_role_cd', '구성원역할코드','CD'),
]

t_cnt = 0
for (col, logic, dom_key) in NEW_TERMS:
    if col in term_set:
        print(f'  [SKIP] {col.upper():<26}')
        continue
    parts   = col.upper().split('_')
    dom_id  = dom_dic.get(dom_key)
    comp_ids= [word_dic[p] for p in parts if p in word_dic]
    stored  = ','.join(comp_ids)
    dic_id  = str(uuid.uuid4())
    cur.execute('''
        INSERT INTO STD_DIC (STD_AREA_ID,DIC_ID,AVAL_END_DT,AVAL_ST_DT,
            DIC_LOG_NM,DIC_PHY_NM,DIC_PHY_FLL_NM,DIC_DESC,
            ENT_CLSS_YN,ATTR_CLSS_YN,STANDARD_YN,FORBID_YN,
            DOM_NM_USE_YN,DIC_GBN_CD,TERM_GBN_CD,DOM_USE_YN,
            DOM_ID,STORED_TERM_COMP_IDS,SORTED_TERM_COMP_IDS)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ''', (STD_AREA,dic_id,END,NOW,logic,col,col.upper(),
          f'{logic} [{"+".join(parts)}+[{dom_key}]]',
          'N','Y','Y','N','Y','0002','0001',
          'Y' if dom_id else 'N',dom_id,stored or None,
          ','.join(sorted(comp_ids)) or None))
    for i,p in enumerate(parts, 1):
        if p in word_dic:
            cur.execute('''INSERT INTO STD_WORD_COMBI
                (STD_AREA_ID,TERM_ID,TGT_GBN_CD,ORDER_NO,WORD_ID,AVAL_END_DT,AVAL_ST_DT)
                VALUES(?,?,?,?,?,?,?)''',
                (STD_AREA,dic_id,'0001',i,word_dic[p],END,NOW))
    print(f'  [등록] {col.upper():<26} | {logic:<14} | [{dom_key}]')
    term_set.add(col); t_cnt+=1

con.commit()

cur.execute("SELECT COUNT(*) FROM STD_DIC WHERE DIC_GBN_CD='0001'"); w=cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM STD_DIC WHERE DIC_GBN_CD='0002'"); t=cur.fetchone()[0]
cur.execute('SELECT COUNT(*) FROM STD_DOM');                          d=cur.fetchone()[0]
print(f'\n최종: STD_DIC 단어={w} 용어={t} / STD_DOM={d}')
con.close()
