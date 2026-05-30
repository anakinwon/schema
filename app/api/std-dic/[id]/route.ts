import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = getDb()
  const row = db.prepare(`
    SELECT d.*, dm.DOM_NM, dm.KEY_DOM_PHY_NM
    FROM STD_DIC d
    LEFT JOIN STD_DOM dm ON d.DOM_ID = dm.DOM_ID
    WHERE d.DIC_ID = ?
  `).get(id)
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(row)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const db = getDb()

  db.prepare(`
    UPDATE STD_DIC SET
      DIC_LOG_NM=?, DIC_PHY_NM=?, DIC_PHY_FLL_NM=?, DIC_DESC=?,
      ENT_CLSS_YN=?, ATTR_CLSS_YN=?,
      DOM_USE_YN=?, DOM_ID=?,
      DATA_TYPE=?, DATA_LEN=?, DATA_SCALE=?,
      STORED_TERM_COMP_IDS=?, SORTED_TERM_COMP_IDS=?
    WHERE DIC_ID=?
  `).run(
    body.DIC_LOG_NM, body.DIC_PHY_NM, body.DIC_PHY_FLL_NM ?? '',
    body.DIC_DESC ?? '',
    body.ENT_CLSS_YN ?? 'N', body.ATTR_CLSS_YN ?? 'Y',
    body.DOM_USE_YN ?? 'N', body.DOM_ID ?? null,
    body.DATA_TYPE ?? null, body.DATA_LEN ?? null, body.DATA_SCALE ?? null,
    body.STORED_TERM_COMP_IDS ?? null, body.SORTED_TERM_COMP_IDS ?? null,
    id,
  )

  // STD_WORD_COMBI 재등록
  if (Array.isArray(body.wordIds)) {
    db.prepare('DELETE FROM STD_WORD_COMBI WHERE TERM_ID=?').run(id)
    const stmt = db.prepare(`
      INSERT INTO STD_WORD_COMBI
        (STD_AREA_ID, TERM_ID, TGT_GBN_CD, ORDER_NO, WORD_ID, AVAL_END_DT, AVAL_ST_DT)
      VALUES(?,?,?,?,?,?,?)
    `)
    const now = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)
    body.wordIds.forEach((wid: string, i: number) => {
      stmt.run('{837B8059-C2C4-46DC-97DD-C64661CA447B}', id, '0001', i + 1, wid, '99991231235959', now)
    })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = getDb()
  db.prepare('DELETE FROM STD_WORD_COMBI WHERE TERM_ID=?').run(id)
  db.prepare('DELETE FROM STD_DIC WHERE DIC_ID=?').run(id)
  return NextResponse.json({ ok: true })
}
