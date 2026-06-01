import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { writeAudit, getChangedBy } from '@/lib/audit'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = getDb()
  const row = db.prepare('SELECT * FROM STD_DOM WHERE DOM_ID=?').get(id)
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(row)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const db = getDb()

  // Audit: 변경 전 데이터 캡처
  const before = db.prepare('SELECT * FROM STD_DOM WHERE DOM_ID=?').get(id) as Record<string, unknown>

  db.prepare(`
    UPDATE STD_DOM SET
      KEY_DOM_NM=?, DOM_NM=?, DOM_DESC=?,
      DOM_TYPE_CD=?, DATA_TYPE_CD=?, DATA_LEN=?, DATA_SCALE=?,
      DATA_FORMAT=?, DATA_MIN=?, DATA_MAX=?,
      KEY_DOM_PHY_NM=?
    WHERE DOM_ID=?
  `).run(
    body.KEY_DOM_NM, body.DOM_NM, body.DOM_DESC ?? null,
    body.DOM_TYPE_CD ?? null, body.DATA_TYPE_CD ?? null,
    body.DATA_LEN ?? null, body.DATA_SCALE ?? null,
    body.DATA_FORMAT ?? null, body.DATA_MIN ?? null, body.DATA_MAX ?? null,
    body.KEY_DOM_PHY_NM, id,
  )

  // Audit: UPDATE 기록
  writeAudit({
    entityType: 'STD_DOM', entityId: id,
    entityNm: body.KEY_DOM_NM ?? (before?.KEY_DOM_NM as string),
    actionType: 'UPDATE',
    before, after: body,
    changedBy: await getChangedBy(req),
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = getDb()

  // Audit: 삭제 전 데이터 캡처
  const before = db.prepare('SELECT * FROM STD_DOM WHERE DOM_ID=?').get(id) as Record<string, unknown>

  db.prepare("UPDATE STD_DIC SET DOM_USE_YN='N', DOM_NM_USE_YN='N', DOM_ID=NULL WHERE DOM_ID=?").run(id)
  db.prepare('DELETE FROM STD_DOM WHERE DOM_ID=?').run(id)

  // Audit: DELETE 기록
  if (before) {
    writeAudit({
      entityType: 'STD_DOM', entityId: id,
      entityNm: before.KEY_DOM_NM as string,
      actionType: 'DELETE', before,
      changedBy: await getChangedBy(req),
    })
  }

  return NextResponse.json({ ok: true })
}
