import sys, sqlite3
sys.stdout.reconfigure(encoding='utf-8')

DB = r'c:\Users\anaki\workspace\claude-nextjs-starters\.claude\skills\data-architecture-team\1-chief-data-architect\da-common-sqlite-ops\references\SQLiteDB_for_META_v5.db'
con = sqlite3.connect(DB)
con.text_factory = str
cur = con.cursor()

# 분류어별 물리 SQL 타입 정의
# KEY: KEY_DOM_PHY_NM == DIC_PHY_NM
# (DATA_TYPE, DATA_LEN, DATA_SCALE)
DOMAIN_TYPES = {
    'ADDR':  ('TEXT',       None, None),   # 주소 — 길이는 컬럼 단위 지정 (기본 200 / 상세 100)
    'AMT':   ('NUMERIC',    21,   3),      # 금액 — NUMERIC(21,3)
    'BDY':   ('VARCHAR',    8,    None),   # 생일 — VARCHAR(8) YYYYMMDD
    'CD':    ('VARCHAR',    None, None),   # 코드 — 길이는 코드셋 정의 따름
    'CNT':   ('INTEGER',    None, None),   # 건수
    'CONT':  ('TEXT',       None, None),   # 내용 — 장문 자유형식
    'DT':    ('DATE',       None, None),   # 일자 — DATE
    'DTM':   ('TIMESTAMP',  None, None),   # 일시 — TIMESTAMP (v1 시스템컬럼)
    'DTS':   ('TIMESTAMP',  None, None),   # 일시 — TIMESTAMP (v2 시스템컬럼)
    'ENC':   ('VARCHAR',    None, None),   # 암호화 값 — 알고리즘별 길이 가변
    'ID':    ('VARCHAR',    20,   None),   # 아이디 — VARCHAR(20)
    'NM':    ('VARCHAR',    None, None),   # 명칭 — 길이는 테이블 정의 따름
    'NO':    ('VARCHAR',    None, None),   # 번호 — 길이는 테이블 정의 따름
    'PRICE': ('NUMERIC',    15,   2),      # 가격 — NUMERIC(15,2)
    'QTY':   ('INTEGER',    None, None),   # 수량
    'SEQNO': ('INTEGER',    None, None),   # 순번 — 복합PK 전용
    'UP':    ('NUMERIC',    21,   3),      # 단가 — NUMERIC(21,3)
    'YN':    ('VARCHAR',    1,    None),   # 여부 — VARCHAR(1)
}

print('=== STD_DIC 분류어 DATA_TYPE / DATA_LEN / DATA_SCALE 보정 ===')
updated = 0

for phy_nm, (data_type, data_len, data_scale) in sorted(DOMAIN_TYPES.items()):
    cur.execute("""
        UPDATE STD_DIC
        SET    DATA_TYPE  = ?,
               DATA_LEN   = ?,
               DATA_SCALE = ?
        WHERE  DIC_GBN_CD = '0001'
          AND  DIC_PHY_NM = ?
          AND  (DATA_TYPE IS NULL OR DATA_TYPE = '')
    """, (data_type, data_len, data_scale, phy_nm))

    rows = cur.rowcount
    len_str = f'({data_len}{"," + str(data_scale) if data_scale else ""})' if data_len else ''
    mark = '✓' if rows > 0 else '- (이미있음)'
    print(f'  {mark} {phy_nm:<8} → DATA_TYPE={data_type + len_str:<22} LEN={str(data_len):<5} SCALE={data_scale}')
    updated += rows

con.commit()

# ── 검증: STD_DIC 분류어 전체 물리타입 확인
print()
print('=== 검증: STD_DIC 분류어 물리타입 최종 현황 ===')
cur.execute("""
    SELECT d.DIC_PHY_NM, d.DIC_LOG_NM,
           d.DATA_TYPE, d.DATA_LEN, d.DATA_SCALE,
           d.DOM_USE_YN, dm.DOM_NM
    FROM   STD_DIC d
    LEFT JOIN STD_DOM dm ON d.DOM_ID = dm.DOM_ID
    WHERE  d.DIC_GBN_CD = '0001'
      AND  d.DIC_PHY_NM IN (SELECT KEY_DOM_PHY_NM FROM STD_DOM)
    ORDER  BY d.DIC_PHY_NM
""")
all_ok = True
for r in cur.fetchall():
    ok = r[2] is not None
    if not ok: all_ok = False
    mark = '✓' if ok else '✗'
    len_str = f'({r[3]}{"," + str(r[4]) if r[4] else ""})' if r[3] else ''
    print(f'  {mark} {r[0]:<8} | {r[1]:<6} | {r[2] or "NULL!":<12}{len_str:<12} | DOM_USE_YN={r[5]} | {r[6]}')

print()
cur.execute("""
    SELECT COUNT(*) FROM STD_DIC
    WHERE  DIC_GBN_CD = '0001'
      AND  DIC_PHY_NM IN (SELECT KEY_DOM_PHY_NM FROM STD_DOM)
      AND  (DATA_TYPE IS NULL OR DATA_TYPE = '')
""")
null_remain = cur.fetchone()[0]
print(f'최종 판정: {"전체 물리명 입력 완료" if all_ok else "미입력 항목 있음!"}')
print(f'DATA_TYPE NULL 잔여: {null_remain}건 / 이번 보정: {updated}건')
con.close()
