import { NextRequest, NextResponse } from 'next/server'
import { getDb, STD_AREA } from '@/lib/db'
import { randomUUID } from 'crypto'
import { writeAudit, getChangedBy } from '@/lib/audit'

const NOW = () => new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)
const END = '99991231235959'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  const db = getDb()
  const rows = db.prepare(`
    SELECT DOM_ID, KEY_DOM_PHY_NM, KEY_DOM_NM, DOM_NM, DOM_TYPE_CD,
           DATA_TYPE_CD, DATA_LEN, DATA_SCALE, DOM_DESC, DATA_FORMAT,
           DATA_MIN, DATA_MAX, DIC_ID
    FROM STD_DOM
    WHERE (? = '' OR KEY_DOM_NM LIKE ? OR KEY_DOM_PHY_NM LIKE ? OR DOM_NM LIKE ?)
    ORDER BY KEY_DOM_PHY_NM
  `).all(q, `%${q}%`, `%${q}%`, `%${q}%`)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const db = getDb()
  const id = randomUUID()

  const dicRow = db.prepare(
    "SELECT DIC_ID FROM STD_DIC WHERE DIC_PHY_NM=? AND DIC_GBN_CD='0001'"
  ).get(body.KEY_DOM_PHY_NM) as { DIC_ID: string } | undefined

  db.prepare(`
    INSERT INTO STD_DOM (
      STD_AREA_ID, DOM_ID, AVAL_END_DT, AVAL_ST_DT,
      KEY_DOM_NM, DOM_NM, DOM_DESC,
      DOM_TYPE_CD, DATA_TYPE_CD, DATA_LEN, DATA_SCALE,
      DATA_FORMAT, DATA_MIN, DATA_MAX,
      SECURITY_YN, KEY_DOM_PHY_NM, DIC_ID
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    STD_AREA, id, END, NOW(),
    body.KEY_DOM_NM, body.DOM_NM, body.DOM_DESC ?? null,
    body.DOM_TYPE_CD ?? null, body.DATA_TYPE_CD ?? null,
    body.DATA_LEN ?? null, body.DATA_SCALE ?? null,
    body.DATA_FORMAT ?? null, body.DATA_MIN ?? null, body.DATA_MAX ?? null,
    'N', body.KEY_DOM_PHY_NM, dicRow?.DIC_ID ?? null,
  )

  if (dicRow) {
    db.prepare(`
      UPDATE STD_DIC SET DOM_USE_YN='Y', DOM_NM_USE_YN='Y', DOM_ID=?
      WHERE DIC_ID=? AND DIC_GBN_CD='0001'
    `).run(id, dicRow.DIC_ID)
  }

  // Audit: INSERT 기록
  writeAudit({
    entityType: 'STD_DOM', entityId: id,
    entityNm: body.KEY_DOM_NM, actionType: 'INSERT',
    after: { ...body, DOM_ID: id },
    changedBy: await getChangedBy(req),
  })

  return NextResponse.json({ DOM_ID: id }, { status: 201 })
}
