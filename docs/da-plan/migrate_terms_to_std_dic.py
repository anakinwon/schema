import sys, sqlite3, uuid
sys.stdout.reconfigure(encoding='utf-8')

DB = r'c:\Users\anaki\workspace\claude-nextjs-starters\.claude\skills\data-architecture-team\1-chief-data-architect\da-common-sqlite-ops\references\SQLiteDB_for_META_v5.db'
STD_AREA = '{837B8059-C2C4-46DC-97DD-C64661CA447B}'
NOW = '20260531100000'
END = '99991231235959'

con = sqlite3.connect(DB)
con.text_factory = str
cur = con.cursor()

# 현재 표준단어 사전 (DIC_GBN_CD='0001')
cur.execute("SELECT DIC_PHY_NM, DIC_ID, DIC_LOG_NM FROM STD_DIC WHERE DIC_GBN_CD='0001'")
word_dic = {r[0].upper(): (r[1], r[2]) for r in cur.fetchall()}

# 표준도메인 사전
cur.execute('SELECT KEY_DOM_PHY_NM, DOM_ID, DOM_NM FROM STD_DOM')
dom_dic = {r[0].upper(): (r[1], r[2]) for r in cur.fetchall()}

# DA_TERM 이전 대상 전체 조회
cur.execute("""
    SELECT TERM_ABBR, TERM_NM, TERM_DESC
    FROM DA_TERM
    WHERE TERM_ID LIKE 'BSNS.COL.%'
    ORDER BY TERM_ABBR
""")
all_terms = cur.fetchall()

# STD_DIC 기등록 표준용어 확인 (DIC_GBN_CD='0002')
cur.execute("SELECT DIC_PHY_NM FROM STD_DIC WHERE DIC_GBN_CD='0002'")
existing = {r[0].lower() for r in cur.fetchall()}

print(f'DA_TERM 이전 대상: {len(all_terms)}건 / 기등록 표준용어: {len(existing)}건')
print()

print('=== STD_DIC 표준용어 등록 (DIC_GBN_CD=0002) + STD_WORD_COMBI ===')
registered = 0
skipped    = 0
warnings   = []

for (abbr, logic_nm, desc) in all_terms:
    col_lower = abbr.lower()
    if col_lower in existing:
        print(f'  [SKIP] {abbr.upper():<28} 이미 존재')
        skipped += 1
        continue

    parts    = abbr.upper().split('_')
    dom_word = parts[-1]         # 마지막 단어 = 도메인 키

    # 도메인 확인
    if dom_word in dom_dic:
        dom_id, dom_nm_str = dom_dic[dom_word]
        dom_use = 'Y'
    else:
        dom_id, dom_nm_str = None, '미연결'
        dom_use = 'N'
        warnings.append(f'도메인 없음: {abbr} (dom_word={dom_word})')

    # 구성 단어 DIC_ID 목록 (모든 파트 포함, 순서 유지)
    comp_ids      = []
    missing_words = []
    word_labels   = []
    for p in parts:
        if p in word_dic:
            comp_ids.append(word_dic[p][0])
            word_labels.append(f'{p}({word_dic[p][1]})')
        else:
            missing_words.append(p)
            word_labels.append(f'{p}(?)')
            warnings.append(f'  단어 미등록: {p} ← {abbr}')

    stored_ids = ','.join(comp_ids)
    sorted_ids = ','.join(sorted(comp_ids))

    # STD_DIC 표준용어 INSERT
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
        logic_nm, col_lower, abbr.upper(),
        desc or logic_nm,
        'N', 'Y', 'Y', 'N',
        'Y', '0002', '0001',
        dom_use, dom_id,
        stored_ids or None,
        sorted_ids or None,
    ))

    # STD_WORD_COMBI INSERT (단어 구성 순서 기록)
    for order, p in enumerate(parts, start=1):
        if p in word_dic:
            cur.execute('''
                INSERT INTO STD_WORD_COMBI
                    (STD_AREA_ID, TERM_ID, TGT_GBN_CD, ORDER_NO, WORD_ID, AVAL_END_DT, AVAL_ST_DT)
                VALUES(?,?,?,?,?,?,?)
            ''', (STD_AREA, dic_id, '0001', order, word_dic[p][0], END, NOW))

    warn_mark = ' ⚠' if missing_words else ''
    print(f'  [등록] {abbr.upper():<28} | {logic_nm:<16} | {"+".join(word_labels)} → [{dom_word}:{dom_nm_str}]{warn_mark}')
    existing.add(col_lower)
    registered += 1

con.commit()

# DA_TERM BSNS.COL.* 전체 삭제
print()
cur.execute("SELECT COUNT(*) FROM DA_TERM WHERE TERM_ID LIKE 'BSNS.COL.%'")
before_cnt = cur.fetchone()[0]
cur.execute("DELETE FROM DA_TERM WHERE TERM_ID LIKE 'BSNS.COL.%'")
con.commit()
print(f'DA_TERM BSNS.COL.* 삭제: {before_cnt}건 → 0건')

# 경고 출력
if warnings:
    print()
    print('=== 경고 사항 ===')
    for w in warnings:
        print(f'  ⚠ {w}')

# 최종 현황
print()
cur.execute('SELECT COUNT(*) FROM STD_DIC');  total = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM STD_DIC WHERE DIC_GBN_CD='0001'"); words = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM STD_DIC WHERE DIC_GBN_CD='0002'"); terms = cur.fetchone()[0]
cur.execute('SELECT COUNT(*) FROM STD_DOM');  doms  = cur.fetchone()[0]
cur.execute('SELECT COUNT(*) FROM STD_WORD_COMBI'); wc = cur.fetchone()[0]
cur.execute('SELECT COUNT(*) FROM DA_TERM');  dt = cur.fetchone()[0]
print('=' * 65)
print(f'STD_DIC 합계     : {total}건')
print(f'  표준단어(0001) : {words}건')
print(f'  표준용어(0002) : {terms}건')
print(f'STD_DOM          : {doms}건')
print(f'STD_WORD_COMBI   : {wc}건')
print(f'DA_TERM 잔여      : {dt}건')
print(f'등록 {registered}건 / 스킵 {skipped}건')
con.close()
