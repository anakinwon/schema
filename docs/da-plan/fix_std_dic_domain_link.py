import sys, sqlite3
sys.stdout.reconfigure(encoding='utf-8')

DB = r'c:\Users\anaki\workspace\claude-nextjs-starters\.claude\skills\data-architecture-team\1-chief-data-architect\da-common-sqlite-ops\references\SQLiteDB_for_META_v5.db'
con = sqlite3.connect(DB)
con.text_factory = str
cur = con.cursor()

# STD_DOM에서 KEY_DOM_PHY_NM → DOM_ID + DOM_NM 매핑 수집
cur.execute('SELECT KEY_DOM_PHY_NM, DOM_ID, DOM_NM, DOM_DESC FROM STD_DOM')
dom_map = {r[0]: (r[1], r[2], r[3]) for r in cur.fetchall()}

# STD_DIC 분류어 전체 조회 (DIC_GBN_CD='0001')
cur.execute("""
    SELECT DIC_ID, DIC_PHY_NM, DIC_LOG_NM, DOM_USE_YN, DOM_ID
    FROM   STD_DIC
    WHERE  DIC_GBN_CD = '0001'
    ORDER  BY DIC_PHY_NM
""")
words = cur.fetchall()

print('=== STD_DIC 분류어 → STD_DOM 물리명 연결 보정 ===')
updated = 0
skipped = 0

for (dic_id, phy_nm, log_nm, dom_use, existing_dom_id) in words:
    if phy_nm not in dom_map:
        # 기본어 — 도메인 연결 불필요
        continue

    dom_id, dom_nm, dom_desc = dom_map[phy_nm]

    if existing_dom_id is not None:
        print(f'  [SKIP] {phy_nm:<8} | {log_nm} → 이미 연결됨')
        skipped += 1
        continue

    # 분류어 물리명 보정: DOM_USE_YN, DOM_NM_USE_YN, DOM_ID 세트
    cur.execute("""
        UPDATE STD_DIC
        SET    DOM_USE_YN    = 'Y',
               DOM_NM_USE_YN = 'Y',
               DOM_ID        = ?
        WHERE  DIC_ID = ?
    """, (dom_id, dic_id))

    # 물리타입 요약 (DOM_DESC 앞 18자 발췌)
    phy_type = (dom_desc or '').replace('[물리타입] ', '').split(' —')[0] if dom_desc else '?'
    print(f'  [보정] {phy_nm:<8} | {log_nm:<6} → DOM={dom_nm:<18} | 물리타입={phy_type}')
    updated += 1

con.commit()

# ── 검증 출력
print()
print('=== 검증: STD_DIC 분류어 도메인 연결 현황 ===')
cur.execute("""
    SELECT d.DIC_PHY_NM, d.DIC_LOG_NM,
           d.DOM_USE_YN, d.DOM_NM_USE_YN,
           dm.DOM_NM, dm.DOM_DESC
    FROM   STD_DIC d
    LEFT   JOIN STD_DOM dm ON d.DOM_ID = dm.DOM_ID
    WHERE  d.DIC_GBN_CD = '0001'
      AND  d.DIC_PHY_NM IN (
               SELECT KEY_DOM_PHY_NM FROM STD_DOM
           )
    ORDER  BY d.DIC_PHY_NM
""")
all_ok = True
for r in cur.fetchall():
    ok = r[2] == 'Y' and r[4] is not None
    if not ok: all_ok = False
    mark = '✓' if ok else '✗'
    phy_type = (r[5] or '').replace('[물리타입] ', '').split(' —')[0]
    print(f'  {mark} {r[0]:<8} | {r[1]:<6} | DOM_USE_YN={r[2]} DOM_NM_USE_YN={r[3]} | {r[4]:<18} | {phy_type}')

print()
cur.execute("""
    SELECT COUNT(*) FROM STD_DIC
    WHERE  DIC_GBN_CD='0001'
      AND  DIC_PHY_NM IN (SELECT KEY_DOM_PHY_NM FROM STD_DOM)
      AND  (DOM_ID IS NULL OR DOM_USE_YN='N')
""")
null_remain = cur.fetchone()[0]
print(f'최종 판정: {"전체 물리명 연결 완료" if all_ok else "미연결 항목 있음!"}')
print(f'DOM_ID NULL 잔여: {null_remain}건 / 이번 보정: {updated}건 / 스킵: {skipped}건')
con.close()
