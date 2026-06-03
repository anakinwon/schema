import { NextRequest, NextResponse } from 'next/server'
import { getDb, STD_AREA } from '@/lib/db'
import { randomUUID } from 'crypto'
import { writeAudit, getChangedBy } from '@/lib/audit'

const NOW = () => new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)
const END = '99991231235959'

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type') ?? '0001'
  const q = req.nextUrl.searchParams.get('q') ?? ''

  const db = getDb()
  const sql = `
    SELECT d.DIC_ID, d.DIC_LOG_NM, d.DIC_PHY_NM, d.DIC_PHY_FLL_NM,
           d.DIC_DESC, d.DIC_GBN_CD, d.ENT_CLSS_YN, d.ATTR_CLSS_YN,
           d.DATA_TYPE, d.DATA_LEN, d.DATA_SCALE,
           d.DOM_USE_YN, d.DOM_ID, d.STORED_TERM_COMP_IDS,
           dm.DOM_NM, dm.KEY_DOM_PHY_NM
    FROM STD_DIC d
    LEFT JOIN STD_DOM dm ON d.DOM_ID = dm.DOM_ID
    WHERE d.DIC_GBN_CD = ?
      AND d.DEL_YN = 'N'
      AND (? = '' OR d.DIC_LOG_NM LIKE ? OR d.DIC_PHY_NM LIKE ?)
    ORDER BY d.DIC_PHY_NM
  `
  const rows = db.prepare(sql).all(type, q, `%${q}%`, `%${q}%`)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const db = getDb()
  const id = randomUUID()

  db.prepare(`
    INSERT INTO STD_DIC (
      STD_AREA_ID, DIC_ID, AVAL_END_DT, AVAL_ST_DT,
      DIC_LOG_NM, DIC_PHY_NM, DIC_PHY_FLL_NM, DIC_DESC,
      ENT_CLSS_YN, ATTR_CLSS_YN, STANDARD_YN, FORBID_YN,
      DOM_NM_USE_YN, DIC_GBN_CD, TERM_GBN_CD, DOM_USE_YN,
      DOM_ID, DATA_TYPE, DATA_LEN, DATA_SCALE,
      STORED_TERM_COMP_IDS, SORTED_TERM_COMP_IDS
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    STD_AREA, id, END, NOW(),
    body.DIC_LOG_NM, body.DIC_PHY_NM, body.DIC_PHY_FLL_NM ?? '',
    body.DIC_DESC ?? '',
    body.ENT_CLSS_YN ?? 'N', body.ATTR_CLSS_YN ?? 'Y', 'Y', 'N',
    body.DIC_GBN_CD === '0002' ? 'Y' : 'N',
    body.DIC_GBN_CD ?? '0001',
    body.DIC_GBN_CD === '0002' ? '0001' : null,
    body.DOM_USE_YN ?? 'N',
    body.DOM_ID ?? null,
    body.DATA_TYPE ?? null, body.DATA_LEN ?? null, body.DATA_SCALE ?? null,
    body.STORED_TERM_COMP_IDS ?? null,
    body.SORTED_TERM_COMP_IDS ?? null,
  )

  if (body.DIC_GBN_CD === '0002' && Array.isArray(body.wordIds)) {
    const stmt = db.prepare(`
      INSERT INTO STD_WORD_COMBI
        (STD_AREA_ID, TERM_ID, TGT_GBN_CD, ORDER_NO, WORD_ID, AVAL_END_DT, AVAL_ST_DT)
      VALUES(?,?,?,?,?,?,?)
    `)
    body.wordIds.forEach((wid: string, i: number) => {
      stmt.run(STD_AREA, id, '0001', i + 1, wid, END, NOW())
    })
  }

  // Audit: INSERT 기록
  writeAudit({
    entityType: 'STD_DIC', entityId: id,
    entityNm: body.DIC_LOG_NM, actionType: 'INSERT',
    after: { ...body, DIC_ID: id },
    changedBy: await getChangedBy(req),
  })

  return NextResponse.json({ DIC_ID: id }, { status: 201 })
}
