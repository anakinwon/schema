import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

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

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = getDb()
  // STD_DIC 분류어 연결 해제
  db.prepare("UPDATE STD_DIC SET DOM_USE_YN='N', DOM_NM_USE_YN='N', DOM_ID=NULL WHERE DOM_ID=?").run(id)
  db.prepare('DELETE FROM STD_DOM WHERE DOM_ID=?').run(id)
  return NextResponse.json({ ok: true })
}
