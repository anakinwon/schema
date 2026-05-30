import sys, sqlite3
sys.stdout.reconfigure(encoding='utf-8')

DB = r'c:\Users\anaki\workspace\claude-nextjs-starters\.claude\skills\data-architecture-team\1-chief-data-architect\da-common-sqlite-ops\references\SQLiteDB_for_META_v5.db'
con = sqlite3.connect(DB)
con.text_factory = str
cur = con.cursor()

# 도메인별 물리 SQL 타입 명세 정의
# KEY: KEY_DOM_PHY_NM
# DOM_DESC  : 물리 SQL 타입 명세 (사람이 읽는 전체 타입 문자열)
# DATA_FORMAT: 형식 패턴 (해당 있을 때만)
DOMAIN_PHY = {
    'ADDR':  ('TEXT',           None,        '주소 문자열 — 기본주소 200자 / 상세주소 100자 (용도별 컬럼에서 길이 지정)'),
    'AMT':   ('NUMERIC(21,3)',  None,        '금액 고정소수점 — 표준 NUMERIC(21,3), 소수 3자리'),
    'BDY':   ('VARCHAR(8)',     'YYYYMMDD',  '생년월일 8자리 문자열 — YYYYMMDD 고정형식'),
    'CD':    ('VARCHAR',        None,        '코드 문자열 — 실제 길이는 STD_CODE 코드셋 정의 따름 (일반 2자리)'),
    'CNT':   ('INTEGER',        None,        '건수/횟수 정수'),
    'CONT':  ('TEXT',           None,        '내용/설명 장문 문자열 — 길이 제한 없음'),
    'DT':    ('DATE',           'YYYYMMDD',  '날짜(일자) — DATE 타입, YYYY-MM-DD 저장'),
    'DTM':   ('TIMESTAMP',      None,        '일시 — TIMESTAMP 타입 (v1 시스템컬럼: reg_dtm / mod_dtm)'),
    'DTS':   ('TIMESTAMP',      None,        '일시 — TIMESTAMP 타입 (v2 시스템컬럼: reg_dts / mod_dts)'),
    'ENC':   ('VARCHAR',        None,        '암호화 값 — 알고리즘별 길이 가변 (BCrypt≒60자, SHA256=64자 등)'),
    'ID':    ('VARCHAR(20)',    None,        '시스템 사용자 아이디 — VARCHAR(20)'),
    'NM':    ('VARCHAR',        None,        '명칭 문자열 — 실사용 길이는 테이블 정의 따름 (일반 100~200자)'),
    'NO':    ('VARCHAR',        None,        '식별 번호 문자열 — 실사용 길이는 테이블 정의 따름 (일반 10~20자)'),
    'PRICE': ('NUMERIC(15,2)',  None,        '가격 고정소수점 — NUMERIC(15,2), 소수 2자리'),
    'QTY':   ('INTEGER',        None,        '수량 정수 — 재고·주문·판매 수량 등'),
    'SEQNO': ('INTEGER',        None,        '순번 정수 — 복합PK 전용, 단독PK 사용 금지 (도메인지침서 §5.4)'),
    'UP':    ('NUMERIC(21,3)',  None,        '단가 고정소수점 — NUMERIC(21,3), 소수 3자리 (AMT와 동일 정밀도)'),
    'YN':    ('VARCHAR(1)',     'Y/N',       "여부 단일문자 — VARCHAR(1), CHECK('Y','N') 필수"),
}

print('=== STD_DOM 물리명(DOM_DESC + DATA_FORMAT) 보정 ===')
updated = 0
for phy_nm, (sql_type, fmt, desc) in sorted(DOMAIN_PHY.items()):
    cur.execute("""
        UPDATE STD_DOM
        SET    DOM_DESC     = ?,
               DATA_FORMAT  = ?
        WHERE  KEY_DOM_PHY_NM = ?
          AND  (DOM_DESC IS NULL OR DOM_DESC = '')
    """, (f'[물리타입] {sql_type} — {desc}', fmt, phy_nm))
    rows = cur.rowcount
    fmt_disp = f'FORMAT={fmt}' if fmt else ''
    mark = '✓' if rows > 0 else '- (이미있음)'
    print(f'  {mark} {phy_nm:<8} → {sql_type:<18} {fmt_disp}')
    updated += rows

con.commit()

# 검증 출력
print()
print('=== 검증: STD_DOM 전체 물리명 현황 ===')
cur.execute("""
    SELECT KEY_DOM_PHY_NM, KEY_DOM_NM, DOM_NM,
           DATA_TYPE_CD, DATA_LEN, DATA_SCALE,
           DOM_DESC, DATA_FORMAT
    FROM   STD_DOM
    ORDER  BY KEY_DOM_PHY_NM
""")
all_ok = True
for r in cur.fetchall():
    phy   = r[0] or '【NULL!】'
    desc  = r[6] or '【NULL — 미입력!】'
    fmt   = r[7] or ''
    status = '✓' if r[0] and r[6] else '✗'
    if not (r[0] and r[6]): all_ok = False
    print(f'  {status} {phy:<8} | {r[2]:<22} | DATA_TYPE={r[3]} LEN={r[4]} SCALE={r[5]}')
    print(f'        DOM_DESC: {desc}')
    if fmt: print(f'        FORMAT  : {fmt}')

print()
print(f'최종 판정: {"전체 물리명 입력 완료" if all_ok else "미입력 항목 있음!"}')
cur.execute('SELECT COUNT(*) FROM STD_DOM WHERE DOM_DESC IS NULL OR DOM_DESC = ""')
null_cnt = cur.fetchone()[0]
print(f'DOM_DESC NULL 잔여: {null_cnt}건 / 이번 보정: {updated}건')
con.close()
