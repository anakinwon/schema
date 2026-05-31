import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { writeAudit, getChangedBy } from '@/lib/audit'

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

  // Audit: 변경 전 데이터 캡처
  const before = db.prepare('SELECT * FROM STD_DIC WHERE DIC_ID=?').get(id) as Record<string, unknown>

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

  // Audit: UPDATE 기록
  writeAudit({
    entityType: 'STD_DIC', entityId: id,
    entityNm: body.DIC_LOG_NM ?? (before?.DIC_LOG_NM as string),
    actionType: 'UPDATE',
    before, after: body,
    changedBy: getChangedBy(req),
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = getDb()

  // TASK-012: 참조 용어 확인
  const refs = db.prepare(`
    SELECT d.DIC_ID, d.DIC_LOG_NM, d.DIC_PHY_FLL_NM
    FROM STD_WORD_COMBI c
    JOIN STD_DIC d ON c.TERM_ID = d.DIC_ID
    WHERE c.WORD_ID = ?
  `).all(id) as { DIC_ID: string; DIC_LOG_NM: string; DIC_PHY_FLL_NM: string }[]

  if (refs.length > 0) {
    return NextResponse.json({
      error: `이 단어를 사용하는 용어가 ${refs.length}건 있어 삭제할 수 없습니다.`,
      usedBy: refs,
    }, { status: 409 })
  }

  // Audit: 삭제 전 데이터 캡처
  const before = db.prepare('SELECT * FROM STD_DIC WHERE DIC_ID=?').get(id) as Record<string, unknown>

  db.prepare('DELETE FROM STD_WORD_COMBI WHERE TERM_ID=?').run(id)
  db.prepare('DELETE FROM STD_DIC WHERE DIC_ID=?').run(id)

  // Audit: DELETE 기록
  if (before) {
    writeAudit({
      entityType: 'STD_DIC', entityId: id,
      entityNm: before.DIC_LOG_NM as string,
      actionType: 'DELETE', before,
      changedBy: getChangedBy(req),
    })
  }

  return NextResponse.json({ ok: true })
}
